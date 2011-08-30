require 'thin'
require 'sinatra'
require 'erb'
require 'oauth'
require 'json'
require 'typhoeus'
require 'uri'

# Development
# set :host, "http://localhost.com:4567"
# set :consumer_key, "QFGhpo6jkxiN7UvN70Dr"
# set :consumer_secret, "jKlOi0e8wNpx6f02ueQzDQXRDfJ4zbVAzWbj3L3C"
# set :site, "http://www.localhost.com"

# QA
set :host, "http://qa-weploader.heroku.com"
set :consumer_key, "CN8a9ikL5nWbgWIeo6V3"
set :consumer_secret, "H3Ik2WfbE8SSgwtC8YUPanw9zeMqqeS0eoI2G262"
set :site, "http://www.qaweplay.com"

set :request_token_path, "/oauth/request_token"
set :access_token_path, "/oauth/access_token"
set :authorize_path, "/oauth/authorize"

set :new_upload_session_path, "/api/v2/media/new_upload_session.json"
set :media_create_from_upload_path, "/api/v1/media/create_from_upload.json"


module WeplayUploader

  def consumer
    OAuth::Consumer.new(settings.consumer_key, settings.consumer_secret,
                             :site => settings.site,
                             :request_token_path => settings.request_token_path,
                             :authorize_path => settings.authorize_path,
                             :access_token_path => settings.access_token_path,
                             :http_method => :get)
  end


   def access_token
     $access_token ||= request_token.get_access_token(:oauth_verifier => session[:oauth_verifier])
   end

   def request_token
     OAuth::RequestToken.new(consumer, session[:request_token], session[:request_token_secret])
   end

end

include WeplayUploader

enable :sessions

get "/" do
  erb :index
end

get "/request-token" do
  if session[:request_token]
    redirect "/"
  else
    # make the access token from your consumer
    access_token = OAuth::AccessToken.new consumer
    # then you'll start the process by requesting a request token from Justin.tv
    # you'll want to send the user along with an oauth_callback parameter, which will be the url
    # that your user will be sent to after they authenticate
    request_token = consumer.get_request_token
    session[:request_token] = request_token.token
    session[:request_token_secret] = request_token.secret
    redirect request_token.authorize_url(:oauth_callback => settings.host)
  end

end

post "/upload" do
  @access_token = access_token
  response_1 = @access_token.post(settings.new_upload_session_path, {})
  upload_json     = JSON.parse(response_1.body)
  upload_url      = upload_json['upload_url']
  upload_token_id = upload_json['upload_token_id']

require "ruby-debug"; debugger

  file = File.new(params[:fileData][:tempfile])

  response_2 = Typhoeus::Request.post(upload_json['upload_url'], :params => {
      :title => "test post", :content => "this is my test",
      :fileData => file
    }
  )

  # response_2 = Nestful.post json['upload_url'], :format => :multipart, :params => {:fileData => params[:fileData][:tempfile] }
  response_3 = @access_token.post(settings.media_create_from_upload_path, { :upload_token_id => upload_token_id })

  @upload_response = JSON.parse(response_3.body)

  erb :index
end

get "/callback" do
  session[:oauth_verifier] = params[:oauth_verifier]
  redirect "/", params
end

get "/clear-session" do
  session.clear
  redirect "/"
end