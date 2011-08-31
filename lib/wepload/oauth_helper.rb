require 'oauth'

module Wepload

  module OauthHelper
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

end