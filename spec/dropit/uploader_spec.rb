require 'spec_helper'

describe DropIt::Uploader do
  include DropIt::Routes

  before(:each) do
    # @upload_session_response = mock('Response', :body => "\{\"upload_url\":\"http://kaltura.com/api\",\"upload_token\":\"abc123\"\}")
    @upload_session_response = mock('Response', :body => {"upload_url" => "http://kaltura.com/api","upload_token"=>"abc123"})
    @access_token = mock(OAuth::AccessToken)

    @upload_session = {"upload_url" => "http://kaltura.com/api","upload_token"=>"abc123"}
    DropIt::UploadSessionRequest.stub!(:post).and_return(@upload_session)
    DropIt::FileUploadRequest.stub!(:post)
    DropIt::CreateMediumRequest.stub!(:post)

    @tempfile = Tempfile.new('image.jpg')
  end

  def params(extra_params = {})
    {
      :tempfile => @tempfile
    }.merge(extra_params)
  end

  def uploader(extra_params = {})
    DropIt::Uploader.new(@access_token, params(extra_params))
  end

  describe "process" do
    it "should queue posts to upload file" do
      DropIt::UploadSessionRequest.should_receive(:post).ordered.with(@access_token).and_return(@upload_session)
      DropIt::FileUploadRequest.should_receive(:post).ordered.with(@upload_session['upload_url'], params)
      DropIt::CreateMediumRequest.should_receive(:post).ordered.with(@access_token, @upload_session['upload_token_id'], params)
      uploader.process
    end
  end

end
