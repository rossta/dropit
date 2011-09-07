require 'active_support/core_ext/object/blank'

module DropIt
  class ApiRequest
    include Routes

    class << self
      def post(*args)
        new(*args).post
      end

      def get(*args)
        new(*args).get
      end
    end
  end

  class GroupsRequest < ApiRequest
    attr_accessor :access_token
    def initialize(access_token)
      @access_token = access_token
    end

    def get
      JSON.parse access_token.get(groups_path).body
    end
  end

  class UploadSessionRequest < ApiRequest
    attr_accessor :access_token
    def initialize(access_token)
      @access_token = access_token
    end

    def post
      JSON.parse(access_token.post(new_upload_session_path).body)
    end
  end

  class FileUploadRequest < ApiRequest
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

  class CreateMediumRequest < ApiRequest
    attr_accessor :access_token, :upload_token_id, :file_params
    def initialize(access_token, upload_token_id, file_params = {})
      @access_token, @upload_token_id, @file_params = access_token, upload_token_id, file_params
    end

    def post
      response = access_token.post(media_create_from_upload_path, post_params).body
      json = JSON.parse(response)

      json = json['medium'] if json['medium'] # To support deprecated API for 'medium' in json root

      json.merge(extracted_file_params)
    end

    def extracted_file_params
      {}.tap do |params|
        [:filename, :size, :type].each { |key| params[key.to_s] = file_params[key] }
      end
    end

    def post_params
      {}.tap do |params|
        params[:upload_token_id] = upload_token_id
        params[:group_id] = file_params[:group_id] unless file_params[:group_id].blank?
      end
    end
  end
end