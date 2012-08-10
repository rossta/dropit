ENV['RACK_ENV'] = 'test'

require 'rubygems'
require 'bundler'
require 'rack/test'
require 'capybara/rspec'
require 'capybara/mechanize'
require 'vcr'

# require 'cgi'
Bundler.setup(:default, :test)
# set :environment, :test # rspec ignoring?
# set :raise_errors, true
# set :logging, true

dir = File.dirname(File.expand_path(__FILE__))
$LOAD_PATH.unshift(dir, 'lib')

require 'dropit'

# Load support files
Dir["#{File.dirname(__FILE__)}/support/**/*.rb"].each { |f| require f }

RSpec.configure do |config|
  config.mock_with :rspec
end

def app
  DropIt::Server
end

Capybara.app = app

class SessionData
  def initialize(cookies)
    @cookies = cookies
    @data = cookies['rack.session']
    if @data
      @data = @data.unpack("m*").first
      @data = Marshal.load(@data)
    else
      @data = {}
    end
  end

  def [](key)
    @data[key]
  end

  def []=(key, value)
    @data[key] = value
    session_data = Marshal.dump(@data)
    session_data = [session_data].pack("m*")
    @cookies.merge("rack.session=#{Rack::Utils.escape(session_data)}", URI.parse("//example.org//"))
    raise "session variable not set" unless @cookies['rack.session'] == session_data
  end
end

def session
  SessionData.new(rack_test_session.instance_variable_get(:@rack_mock_session).cookie_jar)
end

#
# start our own redis when the tests start,
# kill it when they end
#

at_exit do
  pid = `ps -A -o pid,command | grep [r]edis-spec`.split(" ")[0]
  puts "Killing test redis server..."
  `rm -f #{dir}/dump.rdb`
  Process.kill("KILL", pid.to_i)
  # exit $!.status
end

puts "Starting redis for testing at localhost:9736..."
`redis-server #{dir}/redis-spec.conf`
