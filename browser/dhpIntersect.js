var utils, vidistate, backboneEvents, cloud, _self;

const MODULE_NAME = `dhp-intersection`;

var IntersectTree = require('./intersectTree');

window.IntersectTree = null;
window.intersectionArray = [];


module.exports = {
    set: function (o) {
        //console.log('OpenRouteService Module',{o: o, this: this});
        utils = o.utils;
        vidiState = o.state;
        backboneEvents = o.backboneEvents;
        cloud = o.cloud;
        _self = this;
        return this;
    },
    init:function(o){
        backboneEvents.get().on(`reset:infoClick`, () => {
            _self.resetStateToInitial();
        });
        
        utils.createMainTab("dhp-intersection", __("Overlap"), __("Beregn overlap mellem 2 eller flere tegnede oplande. Ændre farven på de hvert enkelt overlappende oplande via farvevælger ikonet."), require('../../../browser/modules/height')().max, "filter_none", false);
        this.addReactComponent();
    },
    addReactComponent(){
        try{
            ReactDOM.render(
                <IntersectTree  ref={(ref) => { window.IntersectTree = ref;}} leafletMap={cloud.get().map} />,
                document.querySelector('#dhp-intersection')
            )
        }catch(err){
            console.log('error mounting '+ MODULE_NAME , err)
        }
    },
    removeReactComponent(){
        ReactDOM.unmountComponentAtNode(document.querySelector('#dhp-intersection'));
    },
    resetStateToInitial(){
        window.IntersectTree.destroy();
        _self.removeReactComponent();
        _self.addReactComponent()
    }
}