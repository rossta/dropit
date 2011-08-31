require './app'

use Rack::ShowExceptions
run Wepload::Server.new
