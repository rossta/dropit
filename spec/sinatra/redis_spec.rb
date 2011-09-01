require 'spec_helper'
require 'redis'

describe Sinatra::Redis do

  class Wepload::TestApp < Sinatra::Base
  end

  def test_app
    Wepload::TestApp
  end


  describe "registered" do

    before(:each) do
      @redis_url = "redis://localhost:9736/0"
      test_app.set :redis_url, @redis_url
      test_app.register Sinatra::Redis
    end

    it "should set redis instance" do
      test_app.redis.should be_an_instance_of(::Redis)
    end

    it "should establish connection to given redis_url" do
      test_app.redis.client.host.should == 'localhost'
      test_app.redis.client.port.should == 9736
    end

    it "should be able to store data" do
      test_app.redis.del("foo")
      test_app.redis.rpush("foo", "bar")
      test_app.redis.rpop("foo").should == "bar"
    end
  end

end
