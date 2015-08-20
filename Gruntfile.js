var fs = require('fs');

module.exports = function(grunt) {

    var pkg = grunt.file.readJSON('package.json');

    // Will add once beta is released
    var banner = [
      "<%= pkg.name %> v<%= pkg.version %>",
      "The MIT License (MIT)",
      "Copyright (c) 2015 <%= pkg.author %>"
    ].join("\n * ").trim();

    grunt.initConfig({

        pkg: pkg,

        concat: {
            options: {
                //banner: "/*! " + banner + " */\n\n"
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
                //banner: "/*! " + banner + " */\n",
                footer: "window.foo = \"<%= pkg.version %>\";",
                preserveComments: 'some'
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
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['concat', 'uglify']);
    grunt.registerTask('develop', ['concat', 'uglify', 'watch']);
};
