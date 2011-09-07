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
    attr_accessor :path, :file_params
    def initialize(path, file_params)
      @path, @file_params = path, file_params
    end

    def post
      file = File.new(file_params[:tempfile])
      Typhoeus::Request.post(path, :params => {
          :title => file_params[:filename] || "",
          :fileData => file
        }
      )
    end
  end

  class CreateMediumRequest < UploadRequest
    include Routes

    attr_accessor :access_token, :upload_token_id, :file_params
    def initialize(access_token, upload_token_id, file_params = {})
      @access_token, @upload_token_id, @file_params = access_token, upload_token_id, file_params
    end

    def post
      response = access_token.post(media_create_from_upload_path, { :upload_token_id => upload_token_id }).body
      json = JSON.parse(response)

      json = json['medium'] if json['medium'] # To support deprecated API for 'medium' in json root

      json.merge(extracted_file_params)
    end

    def extracted_file_params
      {}.tap do |params|
        [:filename, :size, :type].each { |key| params[key.to_s] = file_params[key] }
      end
    end
  end
end