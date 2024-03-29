require 'thin'
require 'sinatra/base'
require 'rack-flash'
require 'erb'
require 'json'
require 'uri'
require 'yaml'
require 'redis'

require 'sinatra/environment'
require 'sinatra/logging'
require 'sinatra/oauth'
require 'sinatra/redis'

module DropIt
  class Server < Sinatra::Base
    use Rack::Flash
    register Sinatra::Environment
    register Sinatra::Oauth
    register Sinatra::Logging
    register Sinatra::Redis

    configure :production, :development do
      enable :logging
    end

    configure :test, :development do
    end

    set :root, File.dirname(File.expand_path(__FILE__)) + '/../..'

    enable :raise_errors
    enable :dump_errors
    enable :sessions

    set :request_token_path, "/oauth/request_token"
    set :access_token_path, "/oauth/access_token"
    set :authorize_path, "/oauth/authorize"

    get "/" do
      log_request

      if oauth_verified?
        erb :index
      else
        erb :access
      end
    end

    get "/request-token" do
      if oauth_verified?
        redirect to("/")
      else
        redirect request_token.authorize_url(:oauth_callback => url('/'))
      end
    end

    get "/groups" do
      log_request
      halt 403 unless oauth_verified?
      content_type :json
      GroupsRequest.get(access_token).to_json
    end

    post "/upload" do
      log_request
      halt 403 unless oauth_verified?

      if file_params = params[:file]
        image = Uploader.new(access_token, file_params.merge(:group_id => params[:group_id])).process

        if request.xhr?
          content_type :json
          puts "Medium upload complete: #{image.inspect}"
          image.to_json
        else
          flash[:notice] = "Success"
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

    post "/bulk-upload" do
      log_request
      halt 403 unless oauth_verified?

      files = params[:files]

      if files && files.any?

        images = files.map do |file_params|
          Uploader.new(access_token, file_params).process
        end

        notice = "Success"

        if request.xhr?
          content_type :json
          response = { :responseText => notice, :images => images }
          puts "Medium upload complete: #{response.inspect}"
          response.to_json
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
      # handle no params[:oauth_verifier]
      # handle no access token
      oauth_verify! params[:oauth_verifier]
      redirect to("/"), params
    end

    get "/clear-session" do
      session.clear
      request.cookies.clear
      redirect to("/")
    end

    # start the server if ruby file executed directly
    # run! if app_file == $0
  end
end
