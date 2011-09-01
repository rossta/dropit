require 'spec_helper'

describe Wepload::UploadRequest do
  include Wepload::Routes

  describe "UploadSessionRequest" do
    describe "self.post" do
      before(:each) do
        @response = mock('Response', :body => "\{\"upload_url\":\"http://kaltura.com/api\",\"upload_token_id\":\"abc123\"\}")
        @access_token = mock(OAuth::AccessToken, :post => @response)
      end
      it "should post an upload session request" do
        request = mock(Wepload::UploadSessionRequest, :post => nil)
        Wepload::UploadSessionRequest.should_receive(:new).and_return(request)
        Wepload::UploadSessionRequest.post(@access_token)
      end

      it "should post to request a new upload session with access token" do
        @access_token.should_receive(:post).with(new_upload_session_path).and_return(@response)
        Wepload::UploadSessionRequest.post(@access_token)
      end

      it "should return the response body as json" do
        Wepload::UploadSessionRequest.post(@access_token).should == {"upload_url" => "http://kaltura.com/api","upload_token_id"=>"abc123"}
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
        request = mock(Wepload::FileUploadRequest, :post => nil)
        Wepload::FileUploadRequest.should_receive(:new).and_return(request)
        Wepload::FileUploadRequest.post(nil)
      end

      it "should post file data to upload_url" do
        upload_url = "http://kaltura.com/api"
        Typhoeus::Request.should_receive(:post).with(upload_url, :params => { :title => "", :fileData => @tempfile })
        Wepload::FileUploadRequest.post(upload_url, { :tempfile => 'tempfile' })
      end
    end
  end

  describe "CreateMediumRequest" do
    before(:each) do
      @response = mock('Response', :body => "\{\"medium\":\{\"id\":5469,\"type\":\"KImage\",\"height\":474,\"k_entry_id\":\"0_rj5efqxi\",\"width\":355\}\}")
      @access_token = mock(OAuth::AccessToken, :post => @response)
    end
    describe "self.post" do
      it "should post an create medium request" do
        request = mock(Wepload::CreateMediumRequest, :post => nil)
        Wepload::CreateMediumRequest.should_receive(:new).and_return(request)
        Wepload::CreateMediumRequest.post(@access_token, "abc123")
      end

      it "should post to create medium path" do
        @access_token.should_receive(:post).with(media_create_from_upload_path, { :upload_token_id => "abc123" })
        Wepload::CreateMediumRequest.post(@access_token, "abc123")
      end

      it "should return the response body as json" do
        json = Wepload::CreateMediumRequest.post(@access_token, "abc123")
        json['medium']['k_entry_id'].should == "0_rj5efqxi"
      end
    end
  end
end
