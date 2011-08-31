require 'thin'
require 'sinatra/base'
require 'rack-flash'
require 'erb'
require 'json'
require 'uri'
require 'yaml'

module Wepload
  class Server < Sinatra::Base
    include OauthHelper
    use Rack::Flash

    dir = File.dirname(File.expand_path(__FILE__)) + '/../..'
    config = YAML.load_file('./config/environment.yml')[settings.environment.to_s]

    set :root, dir
    %Q|host site consumer_key consumer_secret|.split.each do |setting|
      set setting.to_sym, Proc.new { config[setting] }
    end

    set :request_token_path, "/oauth/request_token"
    set :access_token_path, "/oauth/access_token"
    set :authorize_path, "/oauth/authorize"

    set :raise_errors, Proc.new { [:test, :development].include? environment }

    enable :sessions

    get "/" do
      if session[:request_token]
        erb :index
      else
        erb :access
      end
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
require "ruby-debug"; debugger
      files = params[:files]

      if files && files.any?

        files.each do |file_params|
          Uploader.new(access_token, file_params).process!
        end

        notice = "Success!"
        if request.xhr?
          notice
        else
          flash[:notice] = notice
          erb :index
        end

      else
        notice = "No files sent"
        if request.xhr?
          notice
        else
          flash[:notice] = notice
          erb :index
        end
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
