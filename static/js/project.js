//inicializando variaveis

var locations = [
    {
        name : 'Centro de Pesquisa de História Natural e Arqueologia do Maranhão',
        address : 'Rua 28 de Julho, 588-664 - Centro São Luís - MA, 65065-545',
     	lat : -2.528826,
        lng : -44.304834 
    },
    {
        name : 'Praça Nauro Machado',
        address : 'Tv. Marcellino Almeida, 2-86 - Centro São Luís - MA, 65010-490',
        lat : -2.529586,
        lng : -44.305160	
    },
    {
 
        name : 'Convento das Mercês',
        address : 'R. da Palma, 502 - CentroSão Luís - MA, 65010-500',
        lat : -2.533465,
        lng : -44.305013
    },
    {
        name : 'Mercado das Tulhas',
        address : 'R. Dialma Dutra, 187 - Centro São Luís - MA, 65010-170',
        lat : -2.529468, 
        lng : -44.306214
    },
    {
        name : 'Museu Histórico e Artístico do Maranhão',
        address : 'R. do Sol, 311 - Centro São Luís - MA, 65020-590',
        lat : -2.528597, 
        lng : -44.300774
    }
];

var posic;
var map;

// Inicializa Mapa
function iniMap() {
    
    map = new google.maps.Map(document.getElementById('map'));

    
    map.bounds = new google.maps.LatLngBounds();

    // preenche posic
    posic = new google.maps.InfoWindow({
        content: ''
    });

    google.maps.event.addListener(posic, 'closeclick', function(){
        estado_reset();
    });

    // ajusta mapa
    google.maps.event.addDomListener(window, 'resize', function() {
        map.fitBounds(map.bounds);
    });
}



var Location = function(location) {
    var self = this;

    self.name = ko.observable(location.name);
    self.lat = ko.observable(location.lat);
    self.lng = ko.observable(location.lng);
    self.active = ko.observable(false);

    self.setConteudo = function(callback) {
        
        if (self.content){
	    // retorna conteudo
            return self.content();
        }

	        var wikiUrl = 'https://pt.wikipedia.org/w/api.php?action=opensearch&search=' + self.name() + '&format=json&callback=wikiCallback';

        $.ajax({
            url: wikiUrl,
            dataType: 'jsonp',
        })
        .done(function(response) {
            var wikiCont = '';
            if (response){
                if (typeof response[1] !=="undefined" && typeof response[3] !=="undefined"){
                    for (var i = 0; i < 3; i++) {
                        if (typeof response[1][i] !=="undefined" && typeof response[3][i] !=="undefined"){
                            wikiCont += '<a href="' + response[3][i] + '" target"_blank">' + response[1][i] + '</a><br>';
                        }
                    }
                }
            }
            if (wikiCont !== '') {
                self.content = ko.observable('<h4>Resultados da Wiki para "' + self.name() + '"</h4><p>' + wikiCont + '</p>');                 
            } else {
                self.content = ko.observable('<h4>Resultados da Wiki para "' + self.name() + '"</h4><p>Houve um problema no acesso</p>');                 
            }
        })
        .fail(function() {
            console.log("erro no call do ajax");
            self.content = ko.observable('<h4>Resultados da Wiki para  "' + self.name() + '"</h4><p>Houve um problema no acesso</p>');                 
        })
        .always(function() {
            if (typeof callback !== "undefined"){
                callback(self);
            }
        });
	// retorna resultados de busca na wiki
        return '<h4>Resultados da Wiki para "' + self.name() + '"</h4><p><span class="spinner"></span></p>';
    };
        



    // cria marcador
    self.marcador = (function() {

        self.marker = new google.maps.Marker({
            position: {lat: self.lat(), lng: self.lng()},
            map: map,
            title: self.name()
        });

        map.bounds.extend(self.marker.position);

        self.marker.addListener('click', function() {
            selectLocal(self);
        });

    })();
};


var ViewModel = function() {
    var self = this;

    // mostra mapa na tela
    this.mapNotLoaded = ko.observable(false);

    this.ListaLoc = ko.observableArray([]);

    // adiciona objetos para a lista ListaLoc
    locations.forEach(function(location) {
        self.ListaLoc.push( new Location(location));
    });

    
    map.fitBounds(map.bounds);
 
    this.currentLocation = ko.observable(ListaLoc()[0]);

    
    this.searchTerm = ko.observable('');
    
    this.estado_reset = function() {
        self.currentLocation().active(false);
        self.currentLocation().marker.setAnimation(null);
        posic.close();
    };
    this.filtraLoc = ko.computed(function() {
        
        estado_reset();

        // retorna lista
        return self.ListaLoc().filter(function (location) {
            var mostra = true;
            if (self.searchTerm() !== ''){
                if (location.name().toLowerCase().indexOf(self.searchTerm().toLowerCase()) !== -1){
                    mostra = true;
                }else {
                    mostra = false;
                }
            }
            location.marker.setVisible(mostra);

            return mostra;
        });
    });
    this.selectLocal = function(clickedLocation) {
        if (self.currentLocation() == clickedLocation && self.currentLocation().active() === true) {
            estado_reset()
            return;
        }


        estado_reset();

        // atualiza localizacao
        self.currentLocation(clickedLocation);

        self.currentLocation().active(true);


        self.currentLocation().marker.setAnimation(google.maps.Animation.BOUNCE);

        posic.setContent('<h1>' + self.currentLocation().name() + '</h1>' + self.currentLocation().setConteudo(function(l){
            if (self.currentLocation() == l){
                posic.setContent('<h1>' + self.currentLocation().name() + '</h1>' + l.content());
            }
        }));
        posic.open(map, self.currentLocation().marker);


        map.panTo(self.currentLocation().marker.position);
    };

    // configuracoes para dispositivo movel
    this.hideNav = ko.observable( window.innerWidth < 640 );

    this.toggleNav = function() {
        self.hideNav(! self.hideNav());
        google.maps.event.trigger(map, 'resize');
        map.fitBounds(map.bounds);
    };
};

// Callback
var app = function() {
    iniMap();

    ko.applyBindings(ViewModel);
};






// Callback de erro
function googleMapsApiErrorHandler(){
    console.log('Erro: Maps API not loaded');
    $('body').prepend('<p id="map-error">Encontramos um problema ao carregar esta API.</p>');
}
