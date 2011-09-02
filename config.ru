require './app'

use Rack::ShowExceptions
run DropIt::Server.new
