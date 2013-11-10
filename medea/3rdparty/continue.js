/* continue.js - Simple JavaScript continuations implementation.
 *
 * (c) 2013, Alexander C. Gessler
 *  https://github.com/acgessler/continue.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 */


/** JavaScript continuation (kind of) implementation.
 *
 *  This is useful for splitting CPU heavy tasks into multiple slices, which
 *  are processed sequentially, leaving some time in between to avoid rendering
 *  the browser unresponsive. The user provides a a list of 'jobs', each of
 *  which should only do a part of the work. Assignment of jobs to time slices,
 *  and execution thereof is handled by the library then. Additionally, 
 *  jobs get access to timing information (i.e. how much time is remaining in
 *  the current slice), allowing them to voluntarily yield and return another 
 *  continuation job to be run in the next slice.
 *
 *  Basic API usage looks like this:
 *
 *      // a continuation with 100 ms time in between slices
 *      var c = new Continuation(100);
 *      c.add(function(timer) {
 *
 *          // do some work - use timer() to check how many ms we have
 *			// left in this time slice.
 *
 *      });
 *
 *      c.add( ... do more work ...);
 *
 *      // schedule the continuation: by default this runs one
 *      // slice of work and offloads the rest to a later
 *      // point in time. 
 *      c.schedule();
 *
 *   For more information on adding jobs, see the add() member function.
 *   To get a callback once the continuation has finished, see
 *   on_finished()
 *
 */
function Continuation(tick_getter_or_interval) {
	"use strict";

	if(!(this instanceof Continuation)) {
		return new Continuation(tick_getter_or_interval);
	}

	var _tick_getter = tick_getter_or_interval || 100
	,	_jobs = []
	,	_call_next
	,	_done = false
	,	_running = false
	,	_aborted = false
	,	_on_finished_callback = null
	;

	_tick_getter = typeof _tick_getter == 'number' ? function(f) {
		setTimeout(f, _tick_getter);
	} : _tick_getter;

	_call_next = function(slice_duration) {
		var time_remaining = slice_duration
		,	start_time
		,	time_remaining_updater
		;

		if(_done) {
			return;
		}

		start_time = Date.now();
		time_remaining_updater = function() {
			return Math.max(0, slice_duration - (Date.now() - start_time));
		};

		do {
			var job = _jobs.shift();

			var result = job(time_remaining_updater);
			if(typeof result === 'function') {
				_jobs.unshift(result);
			}

			if(!_jobs.length) {
				_done = true;
			}
			else {
				time_remaining = time_remaining_updater();
			}
		}
		while(!_done && time_remaining > 0);

		if(_done) {
			if (_on_finished_callback) {
				_on_finished_callback(!_aborted);
			}
		}
		else {
			_tick_getter(function() {
				_call_next(slice_duration);
			});
		}
	};


	return {

		/** Returns true iff the continuation is finished, i.e. schedule()
		 *  has been called and all jobs registered for the continuation,
		 *  (including dynamically inserted ones) have been called. A
		 *  continuation is also finished() if job execution has been
		 *  abort()ed.  */
		finished : function() {
			return _done;
		},


		/** Returns true iff the continuation is running, i.e. schedule()
		 *  has been called, but it has not finished() yet. */
		running : function() {
			return _running && !_done;
		},


		/** Add a job to the continuation. This is possible iff the continuation 
		 *  is not finished, as per the finished() member function.
		 *
		 *  add() can be called before schedule() happens, or from within existing
		 *  jobs when they get to run. Calling add() enables continuations to
		 *  dynamically add more jobs to the back of the queue. To dynamically
		 *  add jobs to the front of the queue (i.e. jobs that will execute
		 *  next), they can use return values from the job callback as shown 
		 *  below.
		 *
		 *  @param {function} job Job to be added to the continuation.
		 *     A job is simply a function that has the following semantics:
		 *       function(time_remaining_getter) {
		 *     		// optional: return continuation function
		 *			// return function() { ... }
		 *       }
		 *     Where `time_remaining_getter` receives a function taking no 
		 *     parameters which measures the up-to-date time remaining in the current
		 *     time slice. The time is given as non-negative milliseconds value. 
		 *     This function can be called multiple times to help jobs determine 
		 *     whether to offload part of their remaining work to the next time 
		 *     slice.
		 *
		 *     The basic strategy for jobs is:
		 *        i) If the work is simple, constant cost and very likely
		 *        to not exceed the time slice by more than you wish to
		 *        tolerate, simply run your computation.
		 *
		 *        ii) If the work is more complex, not predictable or potentially
		 *        very CPU heavy and therefore device-dependent, structure
		 *        your job in a way that it regularly calls `time_remaining_getter`
		 *        to check if time is remaining, and if not, returns a continuation
		 *        function.
		 **/
		add : function(job) {
			if(_done) {
				return;
			}
			_jobs.push(job);
		},

		/** Add a callback to be called once the continuation has finished.
		 *  
		 *  The completion function is technically similar to a job, but it 
		 *  is kept separately from the normal work queue and is always 
		 *  processed last. Therefore, even if the computation keep adding jobs
		 *  dynamically using add() from within running jobs, the completion
		 *  callback is the last function executed.
		 *
		 *  The callback receives as parameter a boolean value which is 
		 *  false iff the continuation was aborted with abort(), and true otherwise.
		 *
		 *  @param {function} [_on_finished_callback] If undefined, returns the
		 *     currently set completion func (initially a null). Otherwise,
		 *     the parameter specifies a new completion callback.
		 **/
		on_finished : function(on_finished_callback) {
			if (on_finished_callback === undefined) {
				return _on_finished_callback;
			}

			_on_finished_callback = on_finished_callback;
		},


		/** Starts running the continuation.
		 *
		 *  Any Continuation instance can only be scheduled once. After finishing,
		 *  the finished() member returns true and no more jobs are accepted.
		 *  While the continuation runs, more jobs can be added dynamically by
		 *  either calling add() or by returning a new continuation from a job.
		 *  See the docs for add() for the details.
		 *
		 *  @param {number} [slice_duration] Time slice in milliseconds
		 *     to run jobs in. The scheduler runs jobs until this time
		 *     slice is exceeded, and offloads running the remaining jobs
		 *     to a later time slice, which is scheduled using the tick
		 *     getter or setTimeout interval set via the Continue constructor.
		 *  @param {boolean} [force_async] If this parameter is falsy, the
		 *     first time slice runs immediately. If truthy, the first time
		 *     slice is already delayed.
		 */
		schedule : function(slice_duration, force_async) {
			slice_duration = slice_duration || 100;
			if(_done || _running) {
				return;
			}

			if (!_jobs.length) {
				_done = true;
				if (_on_finished_callback) {
					_on_finished_callback(true);
				}
				return;
			}

			_running = true;

			// call one slice immediately unless otherwise requested
			if(force_async) {
				_tick_getter(function() {
					_call_next(slice_duration);
				});
			}
			else {
				_call_next(slice_duration);
			}
		},


		/** Aborts a running continuation.
		 *
		 *  Continuations can only be aborted while they are running().
		 *  After calling abort(), no further jobs will be executed.
		 *  If abort() is called from within a job, and that jobs returns a
		 *  continuation, that continuation is also not executed.
		 **/
		abort : function() {
			if(this.running()) {
				_done = true;
				_aborted = true;
			}
		}
	};
}
