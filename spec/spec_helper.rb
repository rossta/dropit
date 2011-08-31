ENV['RACK_ENV'] = 'test'

require 'rubygems'
require 'bundler'
require 'rack/test'
Bundler.setup(:default, :test)
Bundler.require(:default, :test)

# set :environment, :test # rspec ignoring?
# set :raise_errors, true
# set :logging, false

$LOAD_PATH.unshift(File.dirname(File.expand_path(__FILE__)), 'lib')
require 'wepload'

RSpec.configure do |config|
  config.mock_with :rspec
end

def app
  Wepload::Server
end