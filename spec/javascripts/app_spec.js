describe("WP", function() {
  var data, reader;
  data = new FormData;
  reader = new FileReader;

  beforeEach(function() {
    $("<div id='overlay'>").appendTo('body');
    spyOn(WP.Utils, 'formData').andReturn(data);
    spyOn(WP.Utils, 'fileReader').andReturn(reader);
    spyOn(reader, 'readAsDataURL');
  });

  afterEach(function() {
    $('#overlay').remove();
  });

  it("should be defined", function() {
    expect(WP).toEqual(jasmine.any(Object));
  });

  describe("App", function() {
    var app, files;

    beforeEach(function() {
      app = new WP.App();
      files = [{ name: "image1.jpg"}, { name: "image2.jpg"}];
      spyOn(app, "trigger");
    });

    it("should be defined", function() {
      expect(WP.App).toEqual(jasmine.any(Function));
    });

    describe("ondrop", function() {
      beforeEach(function() {
        spyOn(app, "uploadFile");
      });

      it("should upload files", function() {
        app.ondrop(files);
        expect(app.uploadFile).toHaveBeenCalled();
        expect(app.uploadFile.callCount).toEqual(2);
      });

      it("should trigger 'drop' and 'uploadstart' in view", function() {
        app.ondrop(files);
        expect(app.trigger).toHaveBeenCalledWith('drop', files);
        expect(app.trigger).toHaveBeenCalledWith('uploadstart', files);
      });

      describe("no files", function() {
        it("should not attempt upload", function() {
          app.ondrop([]);
          expect(app.uploadFile).not.toHaveBeenCalled();
        });

        it("should not trigger 'uploadstart' in view", function() {
          app.ondrop([]);
          expect(app.trigger).toHaveBeenCalledWith('drop', []);
          expect(app.trigger).not.toHaveBeenCalledWith('uploadstart', []);
        });
      });
    });

    describe("uploadFile", function() {
      it("should create send a new upload", function() {
        spyOn(WP.Upload, "create");
        app.uploadFile("file", 1);
        expect(WP.Upload.create).toHaveBeenCalledWith("file", 1, { uploadend: jasmine.any(Function)});
      });
    });
  });

  describe("Upload", function() {
    it("should be defined", function() {
      expect(WP.Upload).toEqual(jasmine.any(Object));
    });

    describe("Upload.create", function() {
      beforeEach(function(){
        spyOn(WP.FileReaderUpload.prototype, "initialize");
      });

      it("should create a new FileReaderUpload if FileReader is defined", function() {
        spyOn(_, "isUndefined").andReturn(true);
        expect(WP.Upload.create()).toEqual(jasmine.any(WP.BasicUpload));
      });
      it("should create a new BasicUpload if FileReader is defined", function() {
        spyOn(_, "isUndefined").andReturn(false);
        expect(WP.Upload.create()).toEqual(jasmine.any(WP.FileReaderUpload));
      });
    });

    describe("FileReaderUpload", function() {
      var upload, file;

      beforeEach(function() {
        file = { name: "image.jpg", size: 1234, type: "jpg" };
        upload = new WP.FileReaderUpload(file, 1);
      });

      describe("trigger", function() {
        var callback;
        it("should trigger callback with event name and args", function() {
          callback = jasmine.createSpy();
          upload.bind("foo", callback);
          upload.trigger("foo", "bar", 1);
          expect(callback).toHaveBeenCalledWith("bar", 1);
        });
        it("should not call wrong callback", function() {
          callback = jasmine.createSpy();
          upload.bind("foo", callback);
          upload.trigger("bar", "foo", 1);
          expect(callback).not.toHaveBeenCalled();
        });
      });

      describe("initialize", function() {
        beforeEach(function() {
          upload.initialize();
        });

        it("should read file as data URL", function() {
          expect(upload.reader.readAsDataURL).toHaveBeenCalledWith(file);
        });
      });

      describe("send", function() {
        beforeEach(function() {
          spyOn($, "ajax");
          spyOn(data, "append");
        });

        describe("valid data", function() {

          it('should ajaxify post data', function() {
            upload.send();
            expect($.ajax).toHaveBeenCalledWith({
              type: 'POST',
              url: '/upload',
              data: data,
              cache: false,
              contentType: false,
              processData: false,
              timeout: 60000,
              beforeSend: jasmine.any(Function),
              error: jasmine.any(Function),
              success: jasmine.any(Function)
            });
          });

          it("should build form data", function() {
            upload.send();
            expect(data.append).toHaveBeenCalledWith("files[]", upload.file);
          });
        });
      });

      describe("onloadend", function() {
        var event;

        it('should send', function() {
          event = { target: { result: 'data'}};
          spyOn(upload, 'send');
          upload.onloadend(event);
          expect(upload.send).toHaveBeenCalledWith('data');
        });
      });

      describe("onerror", function() {
        var event;

        it("should trigger error message", function() {
          event = { target: { error: { code: 1 }}};
          upload.onerror(event);
        });

        describe("error message", function() {
          var errorCode;
          it("should report file not found", function() {
            expect(upload.errorMessage(WP.FileReaderUpload.NOT_FOUND_ERR)).toEqual("image.jpg not found");
          });
          it("should report file changed on disk", function() {
            expect(upload.errorMessage(WP.FileReaderUpload.SECURITY_ERR)).toEqual("image.jpg has changed on disk, please re-try");
          });
          it("should report upload cancelled", function() {
            expect(upload.errorMessage(WP.FileReaderUpload.ABORT_ERR)).toEqual("Upload cancelled");
          });
          it("should report file not readable", function() {
            expect(upload.errorMessage(WP.FileReaderUpload.NOT_READABLE_ERR)).toEqual("Cannot read image.jpg");
          });
          it("should report file too large", function() {
            expect(upload.errorMessage(WP.FileReaderUpload.ENCODING_ERR)).toEqual("File too large for browser to upload");
          });
        });
      });

    });
  });

  describe("View", function() {
    var view, app, html;

    html = loadFile('/__spec__/index.erb');

    beforeEach(function() {
      app = new WP.App();
      view = app.view;
      fixture(html);
    });

    afterEach(function() {
      removeFixtures();
    });

    it("should be defined", function() {
      expect(WP.View).toEqual(jasmine.any(Function));
    });

    describe("drop", function() {

      it("should hide overlay", function() {
        app.trigger('drop');
        expect($("#overlay")).toBeHidden();
      });

      it("should empty status text", function() {
        $("#upload-details").html("Previous upload finished");
        app.trigger('drop');
        expect($("#upload-details").html()).toEqual("");
      });

      it("should reset progress bar", function() {
        $("#upload-status-progressbar").hide();
        app.trigger('drop');
        expect($("#upload-status-progressbar")).toBeVisible();
      });
    });

  });

  describe("Settings", function() {
    it("should be defined", function() {
      expect(WP.Settings).toEqual(jasmine.any(Object));
    });

    it("should set defaults", function() {
      expect(WP.Settings.xhr).toBeTruthy();
      expect(WP.Settings.dragdrop).toBeTruthy();
    });
  });

  describe("Utils", function() {
    it("should be defined", function() {
      expect(WP.Utils).toEqual(jasmine.any(Object));
    });

    describe("dataTransferFiles", function() {
      it("should traslate jquery event in to file list", function() {

      });
    });

    describe("formData", function() {

    });
  });

});