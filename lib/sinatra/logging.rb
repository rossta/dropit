require 'sinatra/base'

module Sinatra
  module Logging

    module Helpers

      def logger
        request.logger
      end

      def log_request
        logger.info "params  : #{params.inspect}"
        logger.info "session : #{session.inspect}"
      end

    end

    def self.registered(app)
      app.use Rack::Logger
      app.helpers Sinatra::Logging::Helpers
    end
  end
end