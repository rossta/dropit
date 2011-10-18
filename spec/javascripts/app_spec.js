describe("WP", function() {
  var data, reader, html, app, files, groups;
  html = loadFile('/__spec__/fixtures/index.erb');

  beforeEach(function() {

    data    = jasmine.createSpyObj('FormData', ['append']);;
    reader  = jasmine.createSpyObj('FileReader', ['readAsDataURL']);

    Factory.define('medium', WP.Medium, {
      "type":"KImage", "height":474, "k_entry_id":"0_rj5efqxi", "width":355, "album_id": 891,
      "album_attachable_type": "User", "album_attachable_id": 15, "album_title": "Uploads"
    });

    Factory.define('group', WP.Group, { "id": 76, "name": "Tigers" });

    WP.Media.reset();
    WP.Upload.reset();

    spyOn(WP.Groups, "fetch").andCallFake(function() {
      WP.Groups.reset([
        { "id": 1, "name": "Tigers" }, { "id": 2, "name": "Lions" }
      ]);
    });
    spyOn(WP.Utils, 'formData').andReturn(data);
    spyOn(WP.Utils, 'fileReader').andReturn(reader);

    fixture(html);
  });

  afterEach(function() {
    $("#overlay").remove();
    removeFixtures();
  });

  it("should be defined", function() {
    expect(WP).toEqual(jasmine.any(Object));
  });

  describe("App", function() {

    beforeEach(function() {
      app = new WP.App();
      files = [{ name: "image1.jpg"}, { name: "image2.jpg"}];
      spyOn(app, "trigger");
    });

    describe("initialize", function() {
      it("should render upload status", function() {
        expect($("#main")).toContain("#upload-status");
      });

      it('should render group selector', function() {
        expect($("#main")).toContain("#upload-group-selector");
      });
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
        app.uploadFile("file");
        expect(WP.Upload.create).toHaveBeenCalledWith("file", {
          success: jasmine.any(Function),
          error: jasmine.any(Function)
        });
      });

    });
  });

  describe("Upload", function() {
    it("should be defined", function() {
      expect(WP.Upload).toEqual(jasmine.any(Object));
    });

    describe("queue", function() {
      it('should be a Queue instance', function() {
        expect(WP.Upload.queue).toEqual(jasmine.any(Queue));
      });
    });

    describe("enqueue", function() {
      it("should immediately dequeue if queue size less than max upload", function() {
        WP.Upload.enqueue(jasmine.createSpy());
        expect(WP.Upload.queue.getLength()).toEqual(0);
      });
      it("should keep extra in queue", function() {
        var lastJob = jasmine.createSpy();
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(jasmine.createSpy());
        expect(WP.Upload.queue.getLength()).toEqual(1);
        expect(lastJob).not.toHaveBeenCalled();
      });
      it("should load next upload when one marked finish", function() {
        var lastJob = jasmine.createSpy();
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(jasmine.createSpy());
        WP.Upload.enqueue(lastJob);

        WP.Upload.finish(1);

        expect(WP.Upload.queue.getLength()).toEqual(0);
        expect(lastJob).toHaveBeenCalled();
      });
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
        });

        describe("valid data", function() {

          it('should ajaxify post data', function() {
            upload.opts = {
              success: function() {}
            };
            upload.send();
            expect($.ajax).toHaveBeenCalledWith({
              type: 'POST',
              url: '/upload',
              data: data,
              xhr: jasmine.any(Function),
              cache: false,
              contentType: false,
              processData: false,
              timeout: 60000,
              success: jasmine.any(Function)
            });
          });

          it("should build form data", function() {
            upload.send();
            expect(data.append).toHaveBeenCalledWith("file", upload.fileData);
          });

          it("should send group_id if selected", function() {
            new WP.App();
            $("select#group-id").val("2");
            upload.send();
            expect(data.append).toHaveBeenCalledWith("group_id", "2");
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
    var view;

    beforeEach(function() {
      app = new WP.App();
      view = app.view;
      files = [{ name: "image1.jpg"}, { name: "image2.jpg"}];
    });

    it("should be defined", function() {
      expect(WP.UploadStatus).toEqual(jasmine.any(Function));
    });

    describe("drop", function() {

      it("should hide overlay", function() {
        app.trigger('drop');
        expect($("#overlay")).toBeHidden();
      });

      it("should empty status text", function() {
        $("#upload-details").html("Previous upload finished");
        app.trigger('drop');
        expect($("#upload-details").text()).toEqual("");
      });

      // it("should reset progress bar", function() {
      //   $("#upload-status-progressbar").hide();
      //   app.trigger('drop');
      //   expect($("#upload-status-progressbar")).toBeVisible();
      // });
    });

    describe("uploadstart", function() {
      it('should create placeholders for each file', function() {
        app.uploadstart(files);
        expect($("#upload-results")).toContain(".placeholder");
        expect($("#upload-results .placeholder")).toHaveLength(2);
        expect($("#upload-results .placeholder").text()).toMatch("image1.jpg uploading");
        expect($("#upload-results .placeholder").text()).toMatch("image2.jpg uploading");
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
      var event;
      it("should traslate event in to file list", function() {
        event = { dataTransfer: { files: ['file1', 'file2'] } };
        expect(WP.Utils.dataTransferFiles(event)).toEqual(['file1', 'file2']);
      });
      it("should return null if no dataTransfer property", function() {
        expect(WP.Utils.dataTransferFiles({})).toBeNull();
      });
    });

    describe("domId", function() {
      it("should return <className>_<cid>", function(){
        medium = Factory.create("medium");
        expect(WP.Utils.domId(medium)).toEqual('medium_' + medium.cid);
      });
    });
  });

  describe("WP.Medium", function() {
    beforeEach(function() {
      medium = Factory.create("medium");
    });

    it("should initialize with given attributes", function() {
      expect(medium.get('k_entry_id')).toEqual('0_rj5efqxi');
    });

    describe("sync", function() {
      beforeEach(function() {
        spyOn(WP.Upload, "create");
        spyOn(Backbone, "sync");
      });

      it("should call original backbone sync if fetching", function() {
        medium.fetch();
        expect(Backbone.sync).toHaveBeenCalledWith("read", medium, jasmine.any(Object));
        expect(WP.Upload.create).not.toHaveBeenCalled();
      });

      it("should call upload if creating", function() {
        medium.set({id : null, file: "file object" });
        medium.save();
        expect(WP.Upload.create).toHaveBeenCalledWith("file object", jasmine.any(Object));
        expect(Backbone.sync).not.toHaveBeenCalled();
      });
    });

    describe("src", function() {
      it("should return link to kaltura with k_entry_id", function() {
        medium.set({ k_entry_id: "0_rj5efqxi" });
        expect(medium.src()).toEqual("http://cdn2.kaltura.com/p/56612/thumbnail/entry_id/0_rj5efqxi/width/190/type/3/quality/75");
      });
    });

    describe("albumURL", function() {
      it("should return link to album from album id", function() {
        medium.set({ album_id: 892 });
        expect(medium.albumURL()).toEqual("http://www.weplay.com/albums/892");
      });
    });

    describe("detailURL", function() {
      it("should construct detail url from attachable, album, and id", function() {
        medium.set({
          album_attachable_id: 76,
          album_attachable_type: "Group",
          id: 654321,
          album_id: 892
        });
        expect(medium.detailURL()).toEqual("http://www.weplay.com/groups/76/pics-photos/892/654321");
      });
      it("should return albumURL if no attachable data", function(){
        medium.set({
          album_attachable_id: null,
          album_attachable_type: null,
          id: 654321,
          album_id: 892
        });
        expect(medium.detailURL()).toEqual(medium.albumURL());
      });
    });

    describe("albumDisplayName", function() {
      it("should return '<context> - <album_title>' if defined", function() {
        medium.set({ album_title: "Weplay Uploads" });
        expect(medium.albumDisplayName()).toEqual("Personal Gallery - Weplay Uploads");
      });

      it("should return '<group name> - <album_title> if defined and attachable is a group", function() {
        medium.set({ album_title: "Weplay Uploads", album_attachable_type: "Group", album_attachable_id: 2 });
        expect(medium.albumDisplayName()).toEqual("Lions - Weplay Uploads");
      });

      it("should return albumURL otherwise", function() {
        medium.set({ album_title: null });
        expect(medium.albumDisplayName()).toEqual("Personal Gallery - " + medium.albumURL());
      });
    });

    describe("group", function() {
      it("should return null if album_attachable_type is user", function() {
        expect(medium.group()).toBeFalsy();
      });
      it("should return group if album_attachable_type is group and it exists", function() {
        medium.set({
          album_attachable_type: "Group",
          album_attachable_id: 1
        });
        expect(medium.group()).toEqual(WP.Groups.get(1));
      });
      it("should return null if group does not exist", function() {
        medium.set({
          album_attachable_type: "Group",
          album_attachable_id: 3
        });
        expect(medium.group()).toBeFalsy();
      });
    });

    describe("collection", function() {
      it("should have a global WP.Media collection", function() {
        WP.Media.add({ name: 'image.jpg'});
        expect(WP.Media.length).toEqual(1);
      });
    });

   describe("validate", function() {
     var validation;
     beforeEach(function() {
        medium = Factory.create("medium");
     });
      it("should allow valid file", function() {
        validation = medium.validate({
          filename: "image.jpg",
          type: "image/jpeg",
          size: 256
        });
        expect(validation).toBeNull();
      });

      it("should only allow valid file types", function() {
        validation = medium.validate({
          filename: "memo.text",
          type: "text/plain",
          size: 256
        });
        expect(validation).toMatch("currently not supported");
      });

      it("should limit upload size to 10MB", function() {
        validation = medium.validate({
          filename: "image.jpg",
          type: "image/jpeg",
          size: 10000001
        });
        expect(validation).toMatch("file size 10MB is too large");
      });
   });
  });

  describe("WP.Thumbnail", function() {
    var view, medium;

    beforeEach(function() {
      medium = Factory.create('medium');
    });

    it('should render url for img src', function() {
      view = new WP.Thumbnail({ model: medium });
      expect($(view.el).html()).toMatch(medium.get('k_entry_id'));
    });
  });

  describe("WP.Overlay", function() {
    beforeEach(function() {
      app = new WP.App();
    });
    describe("hidden", function() {
      it("should return false to start", function() {
        expect(app.overlayView.isHidden()).toBeTruthy();
      });
      it("should return false after hiding", function() {
        app.overlayView.show();
        app.overlayView.hide();
        expect(app.overlayView.isHidden()).toBeTruthy();
      });
      it("should return true after showing", function() {
        app.overlayView.show();
        expect(app.overlayView.isHidden()).toBeFalsy();
      });
    });
  });

  describe("WP.GroupSelector", function() {
    it("should return blank if no groups", function() {
      var groupSelect = new WP.GroupSelect({ collection: new WP.GroupCollection });
      expect(groupSelect.el).toEqual("");
    });
  });
});