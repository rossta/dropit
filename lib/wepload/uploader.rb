require 'typhoeus'

module Wepload

  class Uploader
    attr_accessor :access_token, :params
    def initialize(access_token, params)
      @access_token, @params = access_token, params
    end

    def process!
      response = UploadSessionRequest.post(access_token)
      FileUploadRequest.post(response['upload_url'], params)
      CreateMediumRequest.post(access_token, response['upload_token_id'])
    end
  end

end