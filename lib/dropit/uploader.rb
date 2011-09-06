require 'typhoeus'

module DropIt

  class Uploader
    attr_accessor :access_token, :params
    def initialize(access_token, params)
      @access_token, @params = access_token, params
    end

    def process
      session_response = UploadSessionRequest.post(access_token)
      FileUploadRequest.post(session_response['upload_url'], params)
      create_response = CreateMediumRequest.post(access_token, session_response['upload_token_id'], params)
      create_response
    end
  end

end