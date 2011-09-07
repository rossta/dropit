module DropIt

  module Routes

    def new_upload_session_path
      "/api/v2/media/new_upload_session.json"
    end

    def media_create_from_upload_path
      if Server.api_version.to_i == 2
        "/api/v2/media/create_from_upload.json"
      else
        "/api/v1/media/create_from_upload.json"
      end
    end

    def groups_path
      "/api/v1/groups.json"
    end

  end
end