require 'spec_helper'

describe DropIt::ApiRequest do
  include DropIt::Routes

  describe "GroupsRequest" do
    before(:each) do
      @response = mock('Response', :body => "\[\{\"name\":\"Tigers\",\"id\":1\},\{\"name\":\"Lions\",\"id\":2\}\]")
      @access_token = mock(OAuth::AccessToken, :get => @response)
    end
    it "should make request to groups_path" do
      @access_token.should_receive(:get).with(groups_path).and_return(@response)
      DropIt::GroupsRequest.get(@access_token)
    end

    it "should parse list of groups" do
      DropIt::GroupsRequest.get(@access_token).should == [
        {"name" => "Tigers", "id" => 1},
        {"name" => "Lions", "id" => 2}
      ]
    end
  end

  describe "UploadSessionRequest" do
    describe "self.post" do
      before(:each) do
        @response = mock('Response', :body => "\{\"upload_url\":\"http://kaltura.com/api\",\"upload_token_id\":\"abc123\"\}")
        @access_token = mock(OAuth::AccessToken, :post => @response)
      end
      it "should post an upload session request" do
        request = mock(DropIt::UploadSessionRequest, :post => nil)
        DropIt::UploadSessionRequest.should_receive(:new).and_return(request)
        DropIt::UploadSessionRequest.post(@access_token)
      end

      it "should post to request a new upload session with access token" do
        @access_token.should_receive(:post).with(new_upload_session_path).and_return(@response)
        DropIt::UploadSessionRequest.post(@access_token)
      end

      it "should return the response body as json" do
        DropIt::UploadSessionRequest.post(@access_token).should == {"upload_url" => "http://kaltura.com/api","upload_token_id"=>"abc123"}
      end
    end
  end

  describe "FileUploadRequest" do
    describe "self.post" do
      before(:each) do
        Typhoeus::Request.stub!(:post)
        @tempfile = Tempfile.new('image.jpg')
        File.stub!(:new).and_return(@tempfile)
      end
      it "should post an file upload request" do
        request = mock(DropIt::FileUploadRequest, :post => nil)
        DropIt::FileUploadRequest.should_receive(:new).and_return(request)
        DropIt::FileUploadRequest.post(nil)
      end

      it "should post file data to upload_url" do
        upload_url = "http://kaltura.com/api"
        Typhoeus::Request.should_receive(:post).with(upload_url, :params => { :title => "", :fileData => @tempfile })
        DropIt::FileUploadRequest.post(upload_url, { :tempfile => 'tempfile' })
      end
    end
  end

  describe "CreateMediumRequest" do
    before(:each) do
      # @response = mock('Response', :body => "\{\"medium\":\{\"id\":5469,\"type\":\"KImage\",\"height\":474,\"k_entry_id\":\"0_rj5efqxi\",\"width\":355\}\}")
      @response = mock('Response', :body => "\{\"id\":5469,\"type\":\"KImage\",\"height\":474,\"k_entry_id\":\"0_rj5efqxi\",\"width\":355\}")
      @access_token = mock(OAuth::AccessToken, :post => @response)
    end

    describe "self.post" do
      it "should post an create medium request" do
        request = mock(DropIt::CreateMediumRequest, :post => nil)
        DropIt::CreateMediumRequest.should_receive(:new).and_return(request)
        DropIt::CreateMediumRequest.post(@access_token, "abc123")
      end

      it "should post to create medium path" do
        @access_token.should_receive(:post).with(media_create_from_upload_path, { :upload_token_id => "abc123" })
        DropIt::CreateMediumRequest.post(@access_token, "abc123")
      end

      it "should add group_id if present in params" do
        @access_token.should_receive(:post).with(media_create_from_upload_path, { :upload_token_id => "abc123", :group_id => "76" })
        DropIt::CreateMediumRequest.post(@access_token, "abc123", { :group_id => "76" })
      end

      it "should return the response body merged with file params as json" do
        json = DropIt::CreateMediumRequest.post(@access_token, "abc123", { :filename => "image.jpg", :size => 128, :type => "image/jpeg"})
        json['k_entry_id'].should == "0_rj5efqxi"
        json['filename'].should == "image.jpg"
        json['type'].should == "image/jpeg"
        json['size'].should == 128
      end

      it "should work for deprecated api where 'medium' serves as json root" do
        response = mock('Response', :body => "\{\"medium\":\{\"id\":5469,\"type\":\"KImage\",\"height\":474,\"k_entry_id\":\"0_rj5efqxi\",\"width\":355\}\}")
        access_token = mock(OAuth::AccessToken, :post => response)
        json = DropIt::CreateMediumRequest.post(access_token, "abc123", { :filename => "image.jpg", :size => 128, :type => "image/jpeg"})
        json['k_entry_id'].should == "0_rj5efqxi"
        json['filename'].should == "image.jpg"
        json['type'].should == "image/jpeg"
        json['size'].should == 128
      end
    end
  end
end
