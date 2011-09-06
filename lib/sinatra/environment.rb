module Sinatra

  module Environment

    def load_environment_from_yml
      if settings.environment == :production
        settings.consumer_key     = ENV['CONSUMER_KEY']
        settings.consumer_secret  = ENV['CONSUMER_SECRET']
        settings.redis_url        = ENV['REDISTOGO_URL']
        settings.site             = ENV['SITE_URL']
      else
        config = YAML.load_file('./config/environment.yml')[settings.environment.to_s]
        config.each do |key, value|
          set key.to_sym, value
        end
      end
    end

    def self.registered(app)
      app.load_environment_from_yml
    end
  end
end