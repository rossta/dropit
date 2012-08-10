module Sinatra

  module Environment
    class EnvironmentNotConfiguredError < RuntimeError
    end

    def load_environment_from_yml
      if settings.environment == :production
        puts "Loading production environment"
        set :consumer_key     , ENV['CONSUMER_KEY']      || "4f7IArxty9b7fJ5nRxER"
        set :consumer_secret  , ENV['CONSUMER_SECRET']   || "gJh3rLd4Esl5a3cpqjdHHrqU8VfG2VVuMnuYyWca"
        set :redis_url        , ENV['REDISTOGO_URL']     || "redis://127.0.0.1:6379/0"
        set :site             , ENV['SITE_URL']          || "http://www.weplay.com"
        set :api_version      , ENV['API_VERSION']       || "1"
      else
        if !File.exist?('./config/environment.yml')
          raise EnvironmentNotConfiguredError.new(<<-MSG
Environment not configured yet. Run the following and edit the settings in ./config/environment.yml

cp ./config/environment.yml.example ./config/environment.yml

MSG
)
        end
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