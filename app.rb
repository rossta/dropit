$LOAD_PATH.unshift 'lib'
require 'dropit'

# start the server if ruby file executed directly
DropIt::Server.run! if __FILE__ == $0

