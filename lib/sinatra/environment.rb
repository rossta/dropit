module Sinatra

  module Environment

    def load_environment_from_yml
      config = YAML.load_file('./config/environment.yml')[settings.environment.to_s]
      config.each do |key, value|
        set key.to_sym, value
      end
    end

    def self.registered(app)
      app.load_environment_from_yml
    end
  end
end