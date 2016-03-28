'use strict';

var graphDictionary = (function(){

    var values = {};

    function nodeClass(c){
          if(values == {}){ init(); }

          return values["node-class"][c] || "node-person";
   }

   function linkClass(c){
         if(values == {}){ init(); }

         return values["link-class"][c] || "link-cowork";
  }

    function getColor(type){
          if(values == {}){ init(); }

          return values["colors"][type] || "#1d1d1d";
   }

   function getShape(type) {
         if(values == {}){
               init();
         }

         return values["shape"][type] || "square";
   }


   function init(){
          values = {
                "colors" : {
                      "1" : "#EC644B",
                      "2" : "#4183D7",
                      "3" : "#F4D03F",
                      "4" : "#A2DED0"
                },
                "shape" : {
                      "1" : "circle",
                      "2" : "diamond",
                      "3" : "square",
                      "4" : "triangle-up"
                },
                "link-class" : {
                      "1" : "link-cowork",
                      "2" : "link-personal",
                      "3" : "link-sponsored ",
                      "4" : "link-influenced"
                },
                "node-class" : {
                      "1" : "node-person", //startup
                      "2" : "node-institutions",
                      "3" : "node-meetings",
                      "4" : "node-group"
                }
          };
    }

    return {
        init : init,
        getColor : getColor,
        getShape : getShape,
        getLinkClass : linkClass,
        getNodeClass : nodeClass

    };

})();
