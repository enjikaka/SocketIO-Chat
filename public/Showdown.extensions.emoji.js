(function(){
    var emoji = function(converter) {
        return [
            {
            	type: 'lang',
            	filter: function(text) {
            		console.log(text);
            		console.log(twemoji.parse(text));
                	return twemoji.parse(text);
            	}
           	}
        ];
    };

    // Client-side export
    if (typeof window !== 'undefined' && window.Showdown && window.Showdown.extensions) { window.Showdown.extensions.emoji = emoji; }
    // Server-side export
    if (typeof module !== 'undefined') module.exports = emoji;
}());