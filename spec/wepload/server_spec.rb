require 'spec_helper'

describe Wepload::Server do
  include Rack::Test::Methods

  before(:each) do
    request_token = mock(OAuth::RequestToken,
      :token => 'token', :secret => 'secret', :authorize_url => '/',
      :get_access_token => mock(OAuth::AccessToken))
    consumer = mock(OAuth::Consumer, :get_request_token => request_token)

    OAuth::Consumer.stub!(:new).and_return(consumer)
    OAuth::RequestToken.stub!(:new).and_return(request_token)
  end

  it "should respond to /" do
    get '/'
    last_response.should be_ok
    last_response.body.should include('Home')
  end

  it "should respond to /request-token" do
    get '/request-token'
    last_response.should be_redirect
  end

  it "should respond to /callback" do
    get '/callback'
    last_response.should be_redirect
  end

  it "should respond to /clear-session" do
    get '/clear-session'
    last_response.should be_redirect
  end

  it "should respond to /upload" do
    uploader = mock(Wepload::Uploader)
    uploader.should_receive(:process!)
    Wepload::Uploader.stub!(:new).and_return(uploader)

    post '/upload', { :files => [{:tempfile =>'file'}] }
    last_response.should be_ok
    last_response.body.should include('Success')
  end

  it "should respond not process if no files uploaded" do
    uploader = mock(Wepload::Uploader)
    uploader.should_not_receive(:process!)
    Wepload::Uploader.stub!(:new).and_return(uploader)

    post '/upload', { }
    last_response.should be_ok
    last_response.body.include?('No files sent')
  end

  describe "settings" do

    it "should set host" do
      app.settings.host.should == "http://test.localhost:4567"
    end

    it "should set site" do
      app.settings.site.should == "http://www.example.com"
    end

    it "should set consumer info" do
      app.settings.consumer_key.should == "consumer_key"
      app.settings.consumer_secret.should == "consumer_secret"
    end
  end

end
