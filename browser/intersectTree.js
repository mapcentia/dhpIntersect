
const sumEconomyDataFunc = require('../../detailhandelsportalen/commonFunctions/sumEconomyValuesFunction')

var SocioeconomicTableComponent = require('../../detailhandelsportalen/browser/SocioeconomicTableComponent');
var EconomySummaryComponent = require('../../openrouteservice/browser/economysummary');


var IntersectLayer = require('./IntersectLayer');

import {Tabs, Tab, TabList, TabPanel} from 'react-tabs';

class IntersectionTree extends React.Component{
    constructor(props){
        super(props);
        this.state = {
            polygons: null
        };
        this.componentRefArray = [];
    }

    componentDidUpdate(e, i){
        console.log(window.intersectionArray, this.props.intersectionLayers)
    }

    destroy = () => {
        if(this.state.polygons == null){
            return;
        }else{
            this.state.polygons.forEach((feature, index) => {
                if(this.componentRefArray[index]){
                    this.componentRefArray[index].removeLayer();
                }
            });
            this.state.polygons = null;
        }
        
    }

    updateData = (data) => {
        console.log('updateData!',data);
        if(this.state.polygons != null){
            this.destroy();
            /*this.state.polygons.forEach((feature, index) => {
                this.componentRefArray[index].removeLayer();
                feature.layer.remove();
            });*/
        };
        this.setState({polygons:null});
        var structuredData = data.map(geom => {
            let obj = {
                feature: geom,
                layer: L.geoJSON(geom, {}),
                enabled: true,
                economyData: null,
                forbrugData: null
            }
            //this.props.leafletMap.addLayer(obj.layer);
            return obj;
        });

        $.when.apply($, structuredData.map((data) => {
            var reader = new jsts.io.GeoJSONReader();
            let convertedFeature = reader.read(data.feature).geometry.toText();

            return this.getEconomyData("isochrone", "dhp", {catchment: convertedFeature}).then((response) => {
                data.economyData = this.sumEconomyValues(response.features);
            }).then(()=> {
                return this.getForbrugData({catchment: convertedFeature}, "dhp").then((forbrugResponse) => {
                    data.forbrugData = forbrugResponse.features[0];
                })
            })
        })).then(() => {
            console.log('structuredData', structuredData)
            this.setState({polygons: structuredData});
            //console.log('all done!');
        })
        
        //console.log('finally done!',this.state);
    }

    getForbrugData(data, db){
        return $.ajax({
            method: "POST",
            url: `/api/extension/detailhandel/isochrone/${db}`,
            data: {
                    q: data,
                    srs: 4326,
                    lifetime: 0,
                    client_encoding: "UTF8",
                    key: null
            },
            error: function(e){
                console.log('Isochrone Ajax failed', e)
            }
        })
    }

    getEconomyData(type, db, geometry){
        var self = this;
        return $.ajax({
            method:"POST",
            url: `/api/extension/economyData`,
            data: {
                type: type,
                q: geometry,
                db: db,
                srs: 4326,
                lifetime: 0,
                client_encoding: "UTF8",
                key: null
            }/*,
            success: function(data){
                debugger;
                self.economyData = data;
                self.sortedEconomyData = self.sumEconomyValues(data.features);
                //console.log('data!', type, data);
            }*/,
            error: function(data){
                console.log('error!', data);
            }
        })
    }

    sumEconomyValues(values){
        return sumEconomyDataFunc(values);
    }

    highlightLayer({index, mouseEnter}){
        //highlights the layer the user is hovering their mouse on.
        console.log('Highlight layer!',{index, mouseEnter});
        if(mouseEnter == true){
            this.componentRefArray[index].onMouseEnter()
        }else{
            this.componentRefArray[index].onMouseLeave()
        }
    }
    removeLayer = (index) =>{
        let polygonSpread = [...this.state.polygons];
        polygonSpread.splice(index, 1);
        if(polygonSpread.length > 0){
            this.setState(({polygons : polygonSpread}));
        }else{
            this.setState(({polygons : null}));
        }
    }

    render = () =>{
        let tabList = [];
        if(this.state.polygons != null && this.state.polygons[0].economyData && this.state.polygons[0].forbrugData){
            console.log(this.state.polygons)
            //Push tab content onto tabList
            this.state.polygons.forEach((elem, index) => {
                let title = '';
                try{
                    title = elem.feature.properties.selectedLayer.id + " - " + elem.feature.properties.targetLayer.id
                }catch(error){console.log(error)}

                let socioeconomySum = elem.economyData;
                //static data
                let houseInSum = {
                    ant_hus_indk1_: 0,
                    ant_hus_indk2_: 0,
                    ant_hus_indk3_: 0,
                    ant_hus_indk4_: 0,
                    ant_hus_indk5_: 0,
                    ant_hus_indk9_: 0,
                }
                //assign true values from socioeconomy to static data;
                Object.keys(houseInSum).forEach((key) => {
                    houseInSum[key] = socioeconomySum[key];
                });

                let householdData = null;
                
                if(Object.keys(socioeconomySum).length > 0 && socioeconomySum.husinksum > 0){
                    let difference = (socioeconomySum.hussum - socioeconomySum.husinksum) + socioeconomySum.ant_hus_indk9_;
                    let difference_percentage =  parseFloat(((difference / socioeconomySum.hussum)* 100).toFixed(1));

                    householdData = {
                        husinksum: socioeconomySum.husinksum,
                        diff: difference,
                        diff_percent: difference_percentage
                    }
                }

                console.log({economyData: this.economyData, sortedEconomyData: this.sortedEconomyData, data: this.data, houseInSum: houseInSum})
                
                tabList.push({
                    tabTitle: title,
                    tabContent: <React.Fragment>
                        <IntersectLayer index={index} removeLayer={this.removeLayer} leafletMap={this.props.leafletMap} feature={elem.feature} ref={ref => this.componentRefArray[index]=ref}>
                            
                        </IntersectLayer>
                        <div className="social-economy-header">Forbrugstal</div>
                        <ForbrugTable houseInSum={houseInSum} householdDifference={householdData}></ForbrugTable>
                        <EconomySummaryComponent calculatedEconomy={elem.economyData} data={elem.forbrugData.properties} />
                        {elem.economyData.length > 0 ? 'Ingen ekonomi data' : <SocioeconomicTableComponent economy={elem.economyData}/>}
                    </React.Fragment>
                })
            });
        }


        let layerList = (<div className={"panel panel-default tab-pane intersect-container"}>
            <div className="panel-heading"><h4 className="panel-tabTitle" >Overlappende oplande</h4></div>
            <div className="panel-body">
                <Tabs forceRenderTabPanel={true}>
                    <TabList>
                        {tabList.map((e,i) => <Tab key={i} onMouseEnter={this.highlightLayer.bind(this, {index:i, mouseEnter:true})} onMouseLeave={this.highlightLayer.bind(this, {index:i, mouseEnter:false})}> {e.tabTitle} </Tab>)}
                    </TabList>
                    {tabList.map((e, i) => 
                        <TabPanel key={i}>
                            <p className="print-only">{e.tabTitle}</p>
                            <div>{e.tabContent}</div>
                        </TabPanel>
                    )}
                </Tabs>
            </div>
        </div>)

        return (
            <div>
                {this.state.polygons ? layerList : ''}
            </div>
        )
    }
}

module.exports = IntersectionTree;
