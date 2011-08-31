$LOAD_PATH.unshift 'lib'
require 'wepload'

# start the server if ruby file executed directly
Wepload::Server.run! if __FILE__ == $0

