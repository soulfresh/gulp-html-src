var ghtmlsrc = require('../'),
    FakeFile = require('gulp-util').File,
    extend = require('extend'),
    q = require('q'),
    PassThrough = require('stream').PassThrough;

require('mocha');
var expect = require('chai').expect;


describe('gulp-html-src', function() {
	var createFakeReadStream = function(path) {
		var stream =  new PassThrough();
		setTimeout(function() { 
			stream.write('FAKEFILE:');
			stream.write(path);
			stream.end();
		}, 0);
		return stream;
	};



	it('should be a function', function() {
		expect(ghtmlsrc).to.be.a('function');
	});


	it('should emit no files for empty file', function(done) {
		var dataReceived = false;

		var stream = ghtmlsrc();
		stream.on('data', function(data) { 
			dataReceived = true; 
		});

		stream.on('end', function() { 
			expect(dataReceived).to.equal(false);
			done();
		});

		stream.write(new FakeFile({
			path: '/test/test.html',
			contents: new Buffer('<html></html>')
		}));

		stream.read();
		stream.end();

	});

	describe('for Buffer files', function() {
		
		var runForInput = function(html, options, asserts) {
			var dataReceived = [];
			
			// Skip options if not provided
			if (typeof options === 'function') {
				asserts = options;
				options = {};
			}

			options = extend({}, { createReadStream : createFakeReadStream }, options);
			var stream = ghtmlsrc(options);

			stream.on('data', function(data) { 
				dataReceived.push(data);
			});

			stream.on('error', function(err) {
				console.log('error received ', err);
			})

			stream.on('end', function() { 
				asserts(dataReceived);
			});

			stream.write(new FakeFile({
				cwd: '/',
				base: '/test/',
				path: '/test/test.html',
				contents: new Buffer(html)
			}));

			stream.read();
			stream.end();
		}


		it('should emit a single entry for one script', function(done) {
			runForInput('<html><body>' + 
					'<script src="js/test1.js"></script>' +
					'</body>' + 
					'</html>',
					function(dataReceived) {
						expect(dataReceived.length).to.equal(1);
						expect(dataReceived[0].path).to.equal('/test/js/test1.js');
						expect(dataReceived[0].contents.toString()).to.equal('FAKEFILE:/test/js/test1.js');
						done();
					}
			);
			

		});


		it('should emit an entry for each script', function(done) {
			runForInput(
				'<html><body>' + 
					'<script src="js/test1.js"></script>' +
					'<script src="js/test2.js"></script>' +
					'<script src="js/test3.js"></script>' +
				'</body>' + 
				'</html>',
				function(dataReceived) { 
					expect(dataReceived.length).to.equal(3);
					expect(dataReceived[0].path).to.equal('/test/js/test1.js');
					expect(dataReceived[0].contents.toString()).to.equal('FAKEFILE:/test/js/test1.js');
					expect(dataReceived[1].path).to.equal('/test/js/test2.js');
					expect(dataReceived[1].contents.toString()).to.equal('FAKEFILE:/test/js/test2.js');
					expect(dataReceived[2].path).to.equal('/test/js/test3.js');
					expect(dataReceived[2].contents.toString()).to.equal('FAKEFILE:/test/js/test3.js');
					done();
				});

		});

		it('should ignore data-ignore=true scripts', function(done) {
			runForInput(
				'<html><body>' + 
					'<script src="js/test1.js"></script>' +
					'<script src="js/test2.js" data-ignore="true"></script>' +
					'<script src="js/test3.js"></script>' +
					'</body>' + 
				'</html>',
				function(dataReceived) { 
					expect(dataReceived.length).to.equal(2);
					expect(dataReceived[0].path).to.equal('/test/js/test1.js');
					expect(dataReceived[0].contents.toString()).to.equal('FAKEFILE:/test/js/test1.js');
					expect(dataReceived[1].path).to.equal('/test/js/test3.js');
					expect(dataReceived[1].contents.toString()).to.equal('FAKEFILE:/test/js/test3.js');
					done();
				});

		});

		it('should ignore data-remove=true scripts', function(done) {
			runForInput(
				'<html><body>' + 
					'<script src="js/test1.js"></script>' +
					'<script src="js/test2.js" data-remove="true"></script>' +
					'<script src="js/test3.js"></script>' +
					'</body>' + 
					'</html>',
				function(dataReceived) { 
					expect(dataReceived.length).to.equal(2);
					expect(dataReceived[0].path).to.equal('/test/js/test1.js');
					expect(dataReceived[0].contents.toString()).to.equal('FAKEFILE:/test/js/test1.js');
					expect(dataReceived[1].path).to.equal('/test/js/test3.js');
					expect(dataReceived[1].contents.toString()).to.equal('FAKEFILE:/test/js/test3.js');
					done();
				});

		});

		it('should include the html file in transformed stream when the option is set', function(done) {
			runForInput(
				'<html><body>' + 
					'<script src="js/test1.js"></script>' +
					'<script src="js/test2.js" data-remove="true"></script>' +
					'<script src="js/test3.js"></script>' +
					'</body>' + 
					'</html>',
				{ includeHtmlInOutput : true },
				function(dataReceived) { 
						expect(dataReceived.length).to.equal(3);
						expect(dataReceived[0].path).to.equal('/test/js/test1.js');
						expect(dataReceived[0].contents.toString()).to.equal('FAKEFILE:/test/js/test1.js');
						expect(dataReceived[1].path).to.equal('/test/js/test3.js');
						expect(dataReceived[1].contents.toString()).to.equal('FAKEFILE:/test/js/test3.js');
						expect(dataReceived[2].path).to.equal('/test/test.html');
						done();
				}
			);
			
		});


		it('should emit an error event on error opening stream', function(done) {
			var dataReceived = [];
			var errorsReceived = [];
			var stream = ghtmlsrc({ createReadStream : function(path) {
				throw new Error('path not found')
			} } );

			stream.on('data', function(data) { 
				dataReceived.push(data);
			});

			stream.on('error', function(err) {
				errorsReceived.push(err);
			})

			stream.on('end', function() { 
				expect(errorsReceived.length).to.equal(1);
				expect(errorsReceived[0]).to.be.an.instanceOf(Error);
				expect(errorsReceived[0].message).to.equal('path not found');
				done();
			});

			stream.write(new FakeFile({
				cwd: '/',
				base: '/test/',
				path: '/test/test.html',
				contents: new Buffer('<html><body><script src="js/notfound.js"></script></body></html>')
			}));

			stream.read();
			stream.end();
	
		});

	});
	
	
	describe('for streams', function() {
		var createHtmlStream = function(contents) {
			var stream = new PassThrough();
			setTimeout(function() { 
				stream.write(contents);
				stream.end();
			}, 0);
			return stream;
		};


		var runForInput = function(html, options, asserts) {
			var dataReceived = [];
			var errorsReceived = [];
			// Skip options if not provided
			if (typeof options === 'function') {
				asserts = options;
				options = {};
			}

			options = extend({}, { createReadStream : createFakeReadStream }, options);
			var stream = ghtmlsrc(options);

			stream.on('data', function(data) { 
				dataReceived.push(data);
			});

			stream.on('error', function(err) { 
				errorsReceived.push(err);
			});

			stream.on('end', function() { 
				asserts(errorsReceived, dataReceived);
			});

			stream.write(new FakeFile({
				cwd: '/',
				base: '/test/',
				path: '/test/test.html',
				contents: createHtmlStream(html)
			}));

			stream.read();
			stream.end();
		};

		var readStream = function(stream) {
			var deferred = q.defer();
			var contents = [];
			stream.on('readable', function() {
					contents.push(stream.read());
				});

			stream.on('error', function(err) { 
				deferred.reject(err);
			});

			stream.on('end', function() {
				deferred.resolve(Buffer.concat(contents));
			});

			return deferred.promise;
		}

		it('emits no files for empty html', function(done) {
			runForInput('<html></html>', function(errorsReceived, dataReceived) {
				expect(errorsReceived.length).to.equal(0);
				expect(dataReceived.length).to.equal(0);
				done();
			});
		});

		it('emits single script stream from html', function(done) {
			runForInput('<html><body><script src="js/test1.js"></script></html>', function(errorsReceived, dataReceived) {
				expect(errorsReceived.length).to.equal(0);
				expect(dataReceived.length).to.equal(1);
				expect(dataReceived[0].contents).to.be.an.instanceOf(PassThrough);
				readStream(dataReceived[0].contents)
					.then(function(contents) {
						expect(contents.toString()).to.equal('FAKEFILE:/test/js/test1.js');
					})
					.then(done);
			});
		});

		it('emits multiple script streams from html', function(done) {
			runForInput('<html><body>' +
					'<script src="js/test1.js"></script>' +
					'<script src="js/test2.js"></script>' +
					'</body></html>', function(errorsReceived, dataReceived) {
				expect(errorsReceived.length).to.equal(0);
				expect(dataReceived.length).to.equal(2);
				expect(dataReceived[0].contents).to.be.an.instanceOf(PassThrough);
				readStream(dataReceived[0].contents)
					.then(function(contents) {
						expect(contents.toString()).to.equal('FAKEFILE:/test/js/test1.js');
					})
					.then(function() {
						return readStream(dataReceived[1].contents);
					})
					.then(function(contents) {
						expect(contents.toString()).to.equal('FAKEFILE:/test/js/test2.js')
					})
					.then(done);

				
			});
		});

	});


	
});