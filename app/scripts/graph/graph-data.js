'use strict';

var graphData = (function(){

      var data = {};

      function init(){
            data = converter();
      }

      function getData(){

            if(data = {}){
                  init();
            }

            return data;
      }

      function converter(){

            // caso seja necessário implementar algo para converter os dados

            var data = {
              "graph": [],
              "links": [
                {"linkType" : 1, "source": 0, "target": 1},
                {"linkType" : 1, "source": 0, "target": 2},
                {"linkType" : 1, "source": 0, "target": 3},
                {"linkType" : 1, "source": 0, "target": 4},
                {"linkType" : 1, "source": 0, "target": 5},
                {"linkType" : 1, "source": 0, "target": 11},
                {"linkType" : 4, "source": 0, "target": 13},

                {"linkType" : 4, "source": 3, "target": 6},

                {"linkType" : 2, "source": 4, "target": 7},
                {"linkType" : 2, "source": 4, "target": 8},

                {"linkType" : 2, "source": 5, "target": 9},
                {"linkType" : 2, "source": 5, "target": 10},

                {"linkType" : 3, "source": 6, "target": 19},

                {"linkType" : 2, "source": 11, "target": 12},

                {"linkType" : 1, "source": 13, "target": 14},
                {"linkType" : 4, "source": 13, "target": 15},
                {"linkType" : 4, "source": 13, "target": 16},

                {"linkType" : 1, "source": 15, "target": 16},
                {"linkType" : 4, "source": 15, "target": 18},

                {"linkType" : 1, "source": 16, "target": 17}
                  ],
              "nodes": [
                    {"category" : 4, "name": "1o encontro de Startups CIn", "type": "4"},
                    {"category" : 3, "name": "ITBC-Softex", "type": "1"},
                    {"category" : 3, "name": "Mobiclub", "type": "1"},
                    {"category" : 3, "name": "Ubee", "type": "1"},
                    {"category" : 3, "name": "Critical Lab", "type": "1"},

                    {"category" : 3, "name": "Comunnia", "type": "1"},
                    {"category" : 3, "name": "In Loco Media", "type": "3"},
                    {"category" : 3, "name": "Vinta", "type": "3"},
                    {"category" : 3, "name": "Triaxis Capital", "type": "3"},
                    {"category" : 3, "name": "ConcretID", "type": "1"},

                    {"category" : 3, "name": "HashCat", "type": "1"},
                    {"category" : 3, "name": "Locus Lab", "type": "1"},
                    {"category" : 3, "name": "Locus Automação", "type": "3"},
                        {"category" : 3, "name": "CIn", "type": "2"},
                        {"category" : 3, "name": "UFPE", "type": "2"},

                        {"category" : 3, "name": "CESAR", "type": "2"},
                        {"category" : 3, "name": "Porto Digital", "type": "2"},
                        {"category" : 3, "name": "Porto Mídia", "type": "2"},
                        {"category" : 3, "name": "JUMP", "type": "2"},
                        {"category" : 3, "name": "Buscapé", "type": "4"}],
              "directed": false,
              "multigraph": false
            }

            return data;
      }


      return {
            init : init,
            getData : getData
      };

})();
