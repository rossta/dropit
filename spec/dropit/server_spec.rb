require 'spec_helper'

describe DropIt::Server do
  include Rack::Test::Methods

  before(:each) do
    @access_token = mock(OAuth::AccessToken, :token => 'access_token', :access_token_secret => 'access_token_secret')
    @request_token = mock(OAuth::RequestToken,
      :token => 'request_token', :secret => 'request_token_secret', :authorize_url => '/',
      :get_access_token => @access_token)
    consumer = mock(OAuth::Consumer, :get_request_token => @request_token)

    OAuth::Consumer.stub!(:new).and_return(consumer)
    OAuth::RequestToken.stub!(:new).and_return(@request_token)
  end

  def oauth_verified
    get '/request-token'
    get '/callback', { :oauth_verifier => 'verified' }
  end

  describe "/" do
    it "should respond to /" do
      get '/'
      last_response.should be_ok
      last_response.body.should include('DropIt')
    end

    it "should render 'Request Access' link if not oauth_verified" do
      get '/'
      last_response.should be_ok
      last_response.body.should include('Request Access')
      last_response.body.should_not include('Upload your photos')
    end

    it "should render uploader if oauth_verified" do
      oauth_verified
      get '/'
      last_response.should be_ok
      last_response.body.should include('Upload your photos')
      last_response.body.should_not include('Request Access')
    end

  end

  describe "/request-token" do

    it "should redirect" do
      get '/request-token'
      last_response.should be_redirect
    end

  end

  describe "/callback" do
    before(:each) do
      get '/request-token'
    end

    it "should redirect" do
      get '/callback'
      last_response.should be_redirect
    end

    it "should set access_token in session with oauth_verifier" do
      @request_token.should_receive(:get_access_token).with(:oauth_verifier => 'abc123').and_return(@access_token)
      get '/callback', { :oauth_verifier => 'abc123' }
      app.redis.exists('access_token').should be_true
    end

  end

  describe "/clear-session" do
    it "should redirect" do
      get '/clear-session'
      last_response.should be_redirect
    end

    it "should clear session" do
      get '/request-token'
      get '/clear-session'
      get '/'
      last_response.body.should include("Request Access")
    end

  end

  describe "/upload" do
    it "should process uploaded file" do
      uploader = mock(DropIt::Uploader)
      uploader.should_receive(:process)
      DropIt::Uploader.stub!(:new).and_return(uploader)

      post '/upload', { :file => {:tempfile =>'file'} }
      last_response.should be_ok
      last_response.body.should include('Success')
    end

    it "should not process if no files uploaded" do
      uploader = mock(DropIt::Uploader)
      uploader.should_not_receive(:process)
      DropIt::Uploader.stub!(:new).and_return(uploader)

      post '/upload', { }
      last_response.should be_ok
      last_response.body.include?('No files sent')
    end

  end

  describe "/bulk-upload" do
    it "should process uploaded file" do
      uploader = mock(DropIt::Uploader)
      uploader.should_receive(:process)
      DropIt::Uploader.stub!(:new).and_return(uploader)

      post '/bulk-upload', { :files => [{:tempfile =>'file'}] }
      last_response.should be_ok
      last_response.body.should include('Success')
    end

    it "should not process if no files uploaded" do
      uploader = mock(DropIt::Uploader)
      uploader.should_not_receive(:process)
      DropIt::Uploader.stub!(:new).and_return(uploader)

      post '/bulk-upload', { }
      last_response.should be_ok
      last_response.body.include?('No files sent')
    end

  end

  describe "settings" do

    it "should set site" do
      app.settings.site.should == "http://www.example.com"
    end

    it "should set consumer info" do
      app.settings.consumer_key.should == "consumer_key"
      app.settings.consumer_secret.should == "consumer_secret"
    end
  end

end
