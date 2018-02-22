var fs = require('fs');

module.exports = function(grunt) {

    var pkg = grunt.file.readJSON('package.json');

    // Will add once beta is released
    var banner = [
      "<%= pkg.name %> v<%= pkg.version %>",
      "The MIT License (MIT)",
      "Copyright (c) 2018 <%= pkg.author %>",
    ].join("\n * ").trim();

    grunt.initConfig({

        pkg: pkg,

        concat: {
            options: {
                banner: "/*! " + banner + " */\n"
            },
            copy: {
                files: {
                    'dist/ko-reactor.js': ["src/knockout.reactor.js"],
                }
            }
        },

        jshint: {
            all: ['src/**/*.js']
        },

        uglify: {
            options: {
                footer: "window.foo = \"<%= pkg.version %>\";",
                output: {
                    comments: '/^!/'
                }
            },
            main: {
                files: {
                    'dist/ko-reactor.min.js': ['dist/ko-reactor.js'],
                }
            }
        },

        watch: {
            scripts: {
                files: 'src/*.js',
                tasks: ['jshint', 'uglify']
            }
        },

        jasmine: {
            main: {
                src: 'src/**/*.js',
                options: {
                    specs: 'spec/*.js',
                    vendor: [
                      // 'https://cdnjs.cloudflare.com/ajax/libs/knockout/3.4.2/knockout-min.js'
                      './node_modules/knockout/build/output/knockout-latest.js'
                    ]
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('default', ['concat', 'uglify']);
    grunt.registerTask('develop', ['concat', 'uglify', 'watch']);
};
