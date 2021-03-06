// catch simple errors
"use strict";

// declare splat-app namespace if it doesn't already exist
var splat =  splat || {};

// note View-name (Home) matches name of template file Home.html
splat.MovieThumb = Backbone.View.extend({
	//teacher given code, still need to figure why
    thumbsTemplate: _.template([
	"<% titles.each(function(title) { %>",
	    "<%= titleTemplate(title.toJSON()) %>",
	"<% }); %>",
    ].join('')),
	initialize: function () {
		this.listenTo(Backbone, 'orderevent', this.render);
	},
    // render the View

	// set the view element ($el) HTML content using its template
	render: function(){
		$("#content div").html("");
		if(splat.order){
				this.collection.comparator = function(movie) {
					return movie.get(splat.order);
				}
			this.collection.sort();
		}
	this.loadThumbTemplate =$.get('tpl/MovieThumb.html');

	//teacher given code, still need to figure why
	this.loadThumbTemplate.done(function(markup){
    splat.thumbMarkup=markup;
    this.template = _.template(splat.thumbMarkup);
	});
        

        // set the view element ($el) HTML content using its template
	var moviesMarkup = this.thumbsTemplate({
		titles: this.collection,
		titleTemplate: this.template,
	});
        this.$el.append(moviesMarkup);
        return this;    // support method chaining
    }

});
