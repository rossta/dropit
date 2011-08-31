module Wepload

  module Routes

    def new_upload_session_path
      "/api/v2/media/new_upload_session.json"
    end

    def media_create_from_upload_path
      "/api/v1/media/create_from_upload.json"
    end

  end
end