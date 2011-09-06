require 'sinatra/base'
require 'oauth'

module Sinatra

  module Oauth

    module Helpers

      def access_token
        @access_token ||= begin
          return nil unless token = request.cookies["access_token"]
          Marshal.load(redis.get(token))
        end
      end

      def request_token
        if session[:request_token] && session[:request_token_secret]
          ::OAuth::RequestToken.new(consumer, session[:request_token], session[:request_token_secret])
        else
          rtoken = consumer.get_request_token
          session[:request_token] = rtoken.token
          session[:request_token_secret] = rtoken.secret
          rtoken
        end
      end

      def consumer
        ::OAuth::Consumer.new(settings.consumer_key, settings.consumer_secret,
                                 :site => settings.site,
                                 :request_token_path => settings.request_token_path,
                                 :authorize_path => settings.authorize_path,
                                 :access_token_path => settings.access_token_path,
                                 :http_method => :get)
      end

      def oauth_verify!(oauth_verifier)
        atoken = request_token.get_access_token(:oauth_verifier => oauth_verifier)

        store_access_token! atoken

        atoken
      end

      def oauth_verified?
        !access_token.nil?
      end

    private

      def store_access_token!(atoken)
        # Request token is invalidated after retrieving access_token
        session.clear

        token_key = atoken.token
        @access_token = nil

        response.set_cookie "access_token", token_key
        redis.set token_key, Marshal.dump(atoken)
      end

    end

    def self.registered(app)
     app.helpers Sinatra::Oauth::Helpers
    end
  end

end