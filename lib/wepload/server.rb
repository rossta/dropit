require 'thin'
require 'sinatra/base'
require 'erb'
require 'oauth'
require 'json'
require 'typhoeus'
require 'uri'
require 'yaml'

module Wepload
  class Server < Sinatra::Base
    include OauthHelper

    dir = File.dirname(File.expand_path(__FILE__)) + '/../..'
    config = YAML.load_file('./config/environment.yml')[settings.environment.to_s]

    set :root, dir
    %Q|host site consumer_key consumer_secret|.split.each do |setting|
      set setting.to_sym, Proc.new { config[setting] }
    end

    set :request_token_path, "/oauth/request_token"
    set :access_token_path, "/oauth/access_token"
    set :authorize_path, "/oauth/authorize"

    set :new_upload_session_path, "/api/v2/media/new_upload_session.json"
    set :media_create_from_upload_path, "/api/v1/media/create_from_upload.json"

    set :raise_errors, Proc.new { [:test, :development].include? environment }

    enable :sessions

    get "/" do
      erb :index
    end

    get "/request-token" do
      if session[:request_token]
        redirect "/"
      else
        request_token = consumer.get_request_token
        session[:request_token] = request_token.token
        session[:request_token_secret] = request_token.secret
        redirect request_token.authorize_url(:oauth_callback => settings.host)
      end

    end

    post "/upload" do
      Uploader.new(access_token, params).process!

      if request.xhr?
        "Success!"
      else
        erb :index
      end

    end

    get "/callback" do
      session[:oauth_verifier] = params[:oauth_verifier]
      redirect "/", params
    end

    get "/clear-session" do
      session.clear
      redirect "/"
    end

    # start the server if ruby file executed directly
    # run! if app_file == $0
  end
end
