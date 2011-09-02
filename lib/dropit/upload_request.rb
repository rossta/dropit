module DropIt
  class UploadRequest
    class << self
      def post(*args)
        new(*args).post
      end
    end
  end

  class UploadSessionRequest < UploadRequest
    include Routes

    attr_accessor :access_token
    def initialize(access_token)
      @access_token = access_token
    end

    def post
      JSON.parse(access_token.post(new_upload_session_path).body)
    end
  end

  class FileUploadRequest < UploadRequest
    attr_accessor :path, :params
    def initialize(path, params)
      @path, @params = path, params
    end

    def post
      file = File.new(params[:tempfile])
      Typhoeus::Request.post(path, :params => {
          :title => params[:filename] || "",
          :fileData => file
        }
      )
    end
  end

  class CreateMediumRequest < UploadRequest
    include Routes

    attr_accessor :access_token, :upload_token_id
    def initialize(access_token, upload_token_id)
      @access_token, @upload_token_id = access_token, upload_token_id
    end

    def post
      JSON.parse(access_token.post(media_create_from_upload_path, { :upload_token_id => upload_token_id }).body)
    end
  end
end