require "rubygems"
require "rake"
require "bundler/setup"

# $LOAD_PATH.unshift 'lib'
# require 'whassup/tasks'

require 'rspec/core/rake_task'

desc "Run specs"
RSpec::Core::RakeTask.new do |t|
  # t.pattern = "./spec/**/*_spec.rb" # don't need this, it's default.
  # Put spec opts in a file named .rspec in root
end

begin
  require 'jasmine'
  load 'jasmine/tasks/jasmine.rake'
rescue LoadError
  task :jasmine do
    abort "Jasmine is not available. In order to run jasmine, you must: (sudo) gem install jasmine"
  end
end

desc 'Default: run specs.'
task :default => [:spec, "jasmine:ci"]

require 'static_fm'
load 'static_fm/tasks/static_fm.rake'