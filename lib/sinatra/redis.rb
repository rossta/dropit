require 'redis'

module Sinatra
  module Redis

    def redis
      @redis ||= begin
        url = URI(redis_url)
        ::Redis.new({
          :host     => url.host,
          :port     => url.port,
          :db       => url.path[1..-1],
          :password => url.password
        })
      end
    end

    def redis=(url)
      @redis = nil
      set :redis_url, url
      redis
    end


    module Helpers
      def redis
        settings.redis
      end
    end


    def self.registered(app)
      app.set :redis_url, ENV['REDIS_URL'] || "redis://127.0.0.1:6379/0" unless defined?(app.redis_url)
      app.set :redis, app.redis_url
      app.helpers Sinatra::Redis::Helpers
    end

  end
end