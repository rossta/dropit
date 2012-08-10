require 'spec_helper'

describe 'authentication', :type => :acceptance do

  it "grant access to app", :vcr do
    Capybara.current_driver = :mechanize

    visit "/"
    click_link "Request Access"
    click_button "Submit"
  end
end
