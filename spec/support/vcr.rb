VCR.config do |c|
  c.cassette_library_dir  = "spec/vcr"
  c.stub_with :fakeweb
end

RSpec.configure do |c|
  c.treat_symbols_as_metadata_keys_with_true_values = true
  c.around(:each, :vcr) do |example|
    name = example.metadata[:full_description].split(/\s+/, 2).join("/").gsub(/[^\w\/]+/, "_")
    # options = example.metadata.slice(:record, :match_requests_on).except(:example_group)
    VCR.use_cassette(name, { :record => :all }) { example.call }
  end
end