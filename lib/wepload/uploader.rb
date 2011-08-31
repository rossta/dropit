module Wepload
  
  class Uploader
    
    def initialize
      
    end
    
    def process!
      
      # puts "POST to UPLOAD"
      # puts "params: #{params.inspect}"
      # 
      # file_params = params[:multi] || []
      # file_params << params[:fileData] if params[:fileData]
      # 
      # file_params.each do |param|
      #   upload_session_response = @access_token.post(settings.new_upload_session_path, {})
      #   upload_json     = JSON.parse(upload_session_response.body)
      #   upload_url      = upload_json['upload_url']
      #   upload_token_id = upload_json['upload_token_id']
      # 
      #   file = File.new(param[:tempfile])
      #   Typhoeus::Request.post(upload_json['upload_url'], :params => {
      #       :title => param[:filename],
      #       :fileData => file
      #     }
      #   )
      # 
      #   access_token.post(settings.media_create_from_upload_path, { :upload_token_id => upload_token_id })
      # 
    end
  end
end