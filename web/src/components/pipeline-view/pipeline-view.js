import React, {Component} from 'react';
import {connect} from 'react-redux';
import minus from '../../images/minus.svg';
import plus from '../../images/plus_01.svg';
import './pipe-line-view.css';
import Navbar from "../navbar/navbar";
import Input from '../input';
import ProjectContainer from '../projectContainer';
import {SortableDataOperationsList} from './sortable-data-operation-list';
import SelectDataPipelineModal from "../select-data-pipeline/select-data-pipeline-modal";
import arrayMove from 'array-move';
import * as fileActions from "../../actions/fileActions";
import {bindActionCreators} from "redux";
import commitsApi from "../../apis/CommitsApi";
import {INT, FLOAT, regExps, BOOL} from "../../data-types";
import { DataOperationsList } from './data-operations-list';
import { Instruction } from '../instruction/instruction';
import { mlreefFileContent } from "../../data-types";
import {toastr} from 'react-redux-toastr';
import branchesApi from "../../apis/BranchesApi";
import uuidv1 from 'uuid/v1';
import ExecutePipelineModal from './executePipeLineModal';

class PipeLineView extends Component{
    constructor(props){
        super(props);
        this.state = {
            checkBoxOwnDataOperations: false,
            checkBoxStarredDataOperations: false,
            idCardSelected: null,
            showFilters: false,
            showForm: false,
            isShowingExecutePipelineModal: false,
            dataOperations: [
                {
                    title: "Augment", username: "Vaibhav_M", starCount: "243", index: 1, 
                    command: "augment",
                    description: 
                        `Data augmentation multiplies and tweakes the data by changing angle of rotation, flipping the images, zooming in, etc.`,
                    showDescription:false, showAdvancedOptsDivDataPipeline: false, dataType: "Images", 
                    params: {
                        standard: [{name: "Number of augmented images", dataType: INT, required: true}],
                        advanced: [
                            {name: "Rotation range", dataType: FLOAT, required: false},
                            {name: "Width shift range", dataType: FLOAT, required: false},
                            {name: "Height shift range", dataType: FLOAT, required: false},
                            {name: "Shear range", dataType: FLOAT, required: false},
                            {name: "Zoom range", dataType: FLOAT, required: false},
                            {name: "Horizontal flip", dataType: BOOL, required: false},
                        ]
                    }
                },
                {
                    title: "Random crop", username: "Vaibhav_M", starCount: "201", index: 2,
                    command: "random_crop",
                    description: 
                        `This pipeline operation randomly crops a NxM (height x width) portion of the given dataset. 
                        This is used to randomly extract parts of the image incase we need to remove bias present in image data.`,
                    showDescription:false, showAdvancedOptsDivDataPipeline: false, dataType: "Text", 
                    params: {
                       standard: [
                            {name: "Height", dataType: INT, required: true},
                            {name: "Width", dataType: INT, required: true},
                            {name: "Channels", dataType: INT, required: true},
                       ],
                       advanced: [
                           {name: "Random Seed", dataType: INT, required: false}
                       ]
                    }
                },
                {
                    title: "Random rotate", username: "Vaibhav_M", starCount: "170", index: 3,
                    command: "rotate",
                    description: 
                        `A simple rotation operation to rotate images by a specified angle. All images are rotated by this angle.
                        Such a pipeline operation finds use in the case where an entire dataset is skewed and needs to be normalized.`,
                    showDescription:false, showAdvancedOptsDivDataPipeline: false, dataType: "Something Else", 
                    params: {
                        standard: [
                            {name: "Angle of rotation", dataType: FLOAT, required: true}
                        ]
                    }
                },
                {
                    title: "Lee filter", username: "RK_ESA", starCount: "126", index: 4, 
                    command: "lee_filter",
                    description: 
                        `The presence of speckle noise in Synthetic Aperture Radar (SAR) images makes the interpretation of the contents difficult, 
                        thereby degrading the quality of the image. Therefore an efficient speckle noise removal technique, the Lee Filter is used to 
                        smoothen the static-like noise present in these images`,
                    showDescription:false, showAdvancedOptsDivDataPipeline: false, dataType: "Something Else", 
                    params: {
                        standard: [
                            {name: "Intensity", dataType: INT, required: true}
                        ]
                    }
                }
            ],
            showSelectFilesModal: false,
            project: null,
            dataOperationsSelected: [],
            filesSelectedInModal: [],
            commitResponse: null,
        }
        this.handleCheckMarkClick = this.handleCheckMarkClick.bind(this);
        this.drop = this.drop.bind(this);
        this.allowDrop = this.allowDrop.bind(this);
        this.handleDragStart = this.handleDragStart.bind(this);
        this.selectDataClick = this.selectDataClick.bind(this);
        this.handleModalAccept = this.handleModalAccept.bind(this);
        this.copyDataOperationEvent = this.copyDataOperationEvent.bind(this);
        this.deleteDataOperationEvent = this.deleteDataOperationEvent.bind(this);
        this.handleExecuteBtn = this.handleExecuteBtn.bind(this);
        this.toggleExecutePipeLineModal = this.toggleExecutePipeLineModal.bind(this);
    }

    componentWillMount(){
        this.setState({project: this.props.projects.selectedProject});
    }

    componentDidMount(){
        document.getElementById("show-filters-button").style.width = '80%';
    }
    
    callToCommitApi = (branch, action, finalContent) =>
        commitsApi.performCommit(
            this.state.project.id,
            ".mlreef.yml",
            finalContent,
            "gitlab.com",
            branch,
            "pipeline execution",
            action
        )
        .then(res => {
                 !res['id'] || typeof res['id'] === undefined
                    ? this.callToCommitApi(branch, "update", finalContent)
                    : this.setState({commitResponse: res});
        })
        .catch(err => console.log(err));

    onSortEnd = ({oldIndex, newIndex}) => this.setState(({dataOperationsSelected}) => ({
        dataOperationsSelected: arrayMove(dataOperationsSelected, oldIndex, newIndex)
    }));
              
    handleCheckMarkClick(e){
        const newState = this.state;
        newState[e.currentTarget.id] = !this.state[e.currentTarget.id];

        const span = e.currentTarget.nextSibling;
        newState[e.currentTarget.id] 
            ? span.classList.add("pipe-line-active") 
            : span.classList.remove("pipe-line-active");

        this.setState(newState);
    }

    drop = e => e.preventDefault();
    
    createDivToContainOperationSelected = (index, e) => {  
        const array = this.state.dataOperationsSelected;
        const dataCardSelected = JSON.stringify(this.state.dataOperations[index]);
        if(array
            .filter(
                    arr => JSON.stringify(arr) === dataCardSelected
                )
                .length === 0
            ){
            const dataOperationCopy = this.state.dataOperations[index];
            dataOperationCopy.copyDataOperationEvent = this.copyDataOperationEvent;
            dataOperationCopy.deleteDataOperationEvent = this.deleteDataOperationEvent;
            array.push(dataOperationCopy);
            this.setState({dataOperationsSelected: array});
        }
    };

    copyDataOperationEvent(e){
        const array = this.state.dataOperationsSelected;
        const value = {...array[parseInt(e.target.id.split("-")[3]) - 1]};
        
        value.index = this.state.dataOperationsSelected.length - 1;
        array.push(value);

        this.setState({dataOperationsSelected: array});
    }

    deleteDataOperationEvent(e){
        const array = this.state.dataOperationsSelected;
        array.splice(parseInt(e.target.id.split("-")[3]) - 1, 1);

        this.setState({dataOperationsSelected: array});
    }

    allowDrop = e => {
        const dropZone = document.elementFromPoint(e.clientX, e.clientY);
        if(dropZone.id === "drop-zone"){
            const index = this.state.idCardSelected.substr(21, this.state.idCardSelected.length);
            const cardSelected = document.getElementById(this.state.idCardSelected);
            if(cardSelected){
                this.createDivToContainOperationSelected(index, e);
            }
        }
        
        e.preventDefault();
    };

    hideInstruction = () =>
        document.getElementById("instruction-pipe-line").classList.add("invisible");
    
    showFilters = () => {
        const filters = document.getElementById("filters"); 
        const showFilters = !this.state.showFilters;
        this.setState({showFilters:  showFilters});
        const filtersBtn = document.getElementById("show-filters-button");
        if(showFilters){
            filtersBtn.src = minus;
            filters.classList.remove("invisible");
            filtersBtn.style.width = '40%';
        } else {
            filtersBtn.src = plus;
            filtersBtn.style.width = '80%';
            filters.classList.add("invisible");
        }
    };

    handleDragStart(e){
        const newState = {...this.state};
        newState.idCardSelected = e.currentTarget.id;
        this.setState(newState);
        const dt = e.dataTransfer;
        dt.setData('text/plain', e.currentTarget.id);
        dt.effectAllowed = 'move';
    } 
    
    selectDataClick = () => {
        this.setState({showSelectFilesModal: !this.state.showSelectFilesModal});
    };
    
    whenDataCardArrowButtonIsPressed = (e, params) => {
        const desc = document.getElementById(`description-data-operation-item-${params.index}`);
        const parentDropZoneContainerId = document.getElementById(`data-operations-item-${params.index}`).parentNode.id;
        const newState = this.state.dataOperations[params.index];
        const dataOpForm = document.getElementById(`data-operation-form-${params.index}`);
        
        if(parentDropZoneContainerId === 'data-operations-list'){
            newState.showDescription = !newState.showDescription;
            
            this.state.dataOperations[params.index].showDescription 
                ? desc.style.display = "unset"
                : desc.style.display = "none"
        } else {
            newState.showForm = !newState.showForm;
            
            this.state.dataOperations[params.index].showForm 
                ? dataOpForm.style.display = 'unset'
                : dataOpForm.style.display = 'none'
        }    
        this.setState(newState);
    };

    showAdvancedOptionsDivDataPipeline = (e, params) => {
        const newState = this.state.dataOperations[params.index];
        const advancedOptsDiv = document.getElementById(`advanced-opts-div-${params.index}`);

        newState.showAdvancedOptsDivDataPipeline = !newState.showAdvancedOptsDivDataPipeline;
        
        newState.showAdvancedOptsDivDataPipeline
            ? advancedOptsDiv.style.display = 'unset'
            : advancedOptsDiv.style.display = 'none';
        
        this.setState({newState});
    };
    
    handleModalAccept = (e, filesSelected) => {
        this.setState({
            filesSelectedInModal: filesSelected, 
            showSelectFilesModal: !this.state.showSelectFilesModal
        });
        document.getElementById("text-after-files-selected").style.display = "flex";
        document.getElementById("upload-files-options").style.display = "none"; 
        document.getElementsByTagName("body").item(0).style.overflow = 'scroll';
    };

    generateCodeForBranch = () => (uuidv1()).split("-")[0];

    /**
     * @param {input}: input html element which must be highlited to the user as wrong
     * @param {inputDataModel}: data model of input(data type, required, etc)
     * @param {dataOperationsHtmlElm}: operation container which must be highligthed
     */
    showErrorsInTheOperationsSelected = (input, inputDataModel, dataOperationsHtmlElm) => {
        input.style.border = "1px solid red";
        dataOperationsHtmlElm.style.border = "1px solid red";
        const errorDiv = document.getElementById(`error-div-for-${input.id}`);
        errorDiv.style.display = "flex";
        
        input.addEventListener('focusout', () => {
            input.removeAttribute("style");
            errorDiv.style.display = "none";
        });

        dataOperationsHtmlElm.addEventListener('focusout', () => {
            dataOperationsHtmlElm.removeAttribute("style");
        });

        if(inputDataModel.dataType === BOOL){
            const dropDown = input.parentNode.childNodes[1]
            dropDown.style.border = "1px solid red";
            dropDown.addEventListener('focusout', () => {
                dropDown.removeAttribute("style");
            });
        }
    }

    /**
     * @method addFilesSelectedInModal: This funtion is to add folders and files to the command
     * @param {lineWithOutFolderAndFiles}: This is the line without directories or files
     */
    addFilesSelectedInModal(lineWithOutFoldersAndFiles){
        if(this.state.filesSelectedInModal.length === 0){
            toastr.error('Execution failed', 'Check please that you have selected files to be used in the pipeline');
            return undefined;
        }
        let filesLine = "";
        const file = this.state.filesSelectedInModal[0];
        filesLine = `${filesLine} ${file.path}`;
        
        if(file.type === "tree"){
            filesLine = filesLine.concat("/");
        }        

        return lineWithOutFoldersAndFiles.replace("#directoriesAndFiles", filesLine);
    }

    buildCommandLinesFromSelectedPipelines = (
        dataOperationsHtmlElms, 
        errorCounter
    ) =>
        this.state.dataOperationsSelected.map((dataOperation, index) => {
            const dataOperationsHtmlElm = dataOperationsHtmlElms[index];
            let line = `   - python /epf/pipelines/${dataOperation.command}.py#directoriesAndFiles`;
            const dataOpInputs = Array.prototype.slice.call(dataOperationsHtmlElm.getElementsByTagName("input"));
            let advancedParamsCounter = 0;
            dataOpInputs.forEach((input, inputIndex) => {
                let inputDataModel = null;
                if(input.id.startsWith("ad-")){
                    inputDataModel = dataOperation.params.advanced[advancedParamsCounter];
                    advancedParamsCounter = advancedParamsCounter + 1;
                } else {
                    inputDataModel = dataOperation.params.standard[inputIndex];
                }
                
                if(!this.validateInput(input.value, inputDataModel.dataType, inputDataModel.required)){
                    errorCounter = errorCounter + 1;
                    this.showErrorsInTheOperationsSelected(input, inputDataModel, dataOperationsHtmlElm);
                    return;
                }
                line = line.concat(` ${input.value}`);
            });

            return errorCounter === 0 
                ? this.addFilesSelectedInModal(line)
                : undefined;
        });

    generateRealContentFromTemplate = (
        mlreefFileContent,
        pipeLineOperationCommands,
        dataInstanceName
    ) => 
        mlreefFileContent
            .replace(/#replace-here-the-lines/g,
                pipeLineOperationCommands
                    .toString()
                    .replace(/,/g, "\n")
            )
            .replace(/#new-datainstance/g, dataInstanceName)
            .replace(
                /#repo-url/g, 
                this.state.project.http_url_to_repo.substr(
                    8, 
                    this.state.project.http_url_to_repo.length
                )
            );

    handleExecuteModalBtnNextPressed = () => {
        const uuidCodeForBranch = this.generateCodeForBranch();
        const branchName = `data-pipeline/${uuidCodeForBranch}`;
        const dataInstanceName = `data-instance/${uuidCodeForBranch}`;
        const pipeLineOperationCommands = this.buildCommandLinesFromSelectedPipelines(
            Array.prototype.slice.call(
                document
                    .getElementById('data-operations-selected-container')
                    .childNodes
            ).map(
                child => child.childNodes[1]
            ), 0
        );
        if(pipeLineOperationCommands
            .filter(
                line => line !== undefined
            ).length === this.state.dataOperationsSelected.length 
        ){
            const finalContent = this.generateRealContentFromTemplate(
                mlreefFileContent, 
                pipeLineOperationCommands, 
                dataInstanceName
            );
            toastr.info('Execution', 'Pipeline execution has already started');
            branchesApi.create(
                this.state.project.id,
                branchName,
                "master"
            ).then((res) => {
                if(res['commit']){
                    toastr.info('Execution', 'The branch for pipeline was created');
                    this.callToCommitApi(branchName, "create", finalContent);
                }else{
                    toastr.error('Execution', 'The branch for pipeline could not be created');
                }
            }).catch((err) => {
                console.log(err);
                toastr.error('Error', 'Something went wrong, try again later please');
            });
        } else {
            toastr.error('Form', 'Validate please data provided in inputs');
        }
    };

    handleExecuteBtn = () => {
        this.toggleExecutePipeLineModal();    
    }

    validateInput = (value, dataType, required) => {
        if(required && (typeof(value) === undefined || value === "")){
            return false;
        }
        
        switch (dataType) {
            case INT:
                return regExps.INT.test(value);
            case FLOAT:
                return regExps.FLOAT.test(value);
            default:
                return (value === "") || (value === "true") || (value === "false");
        }
    };

    toggleExecutePipeLineModal(){
        const isShowingExecutePipelineModal = !this.state.isShowingExecutePipelineModal;
        this.setState({isShowingExecutePipelineModal: isShowingExecutePipelineModal});
    }

    render = () => {
        const project = this.state.project;
        const dataOperations = this.state.dataOperations;
        const showSelectFilesModal = this.state.showSelectFilesModal;
        const items = this.state.dataOperationsSelected;
        let operationsSelected = items.length;
        operationsSelected++; 
        
        return (
            <div className="pipe-line-view">
                <SelectDataPipelineModal 
                    selectDataClick={this.selectDataClick} 
                    show={showSelectFilesModal} 
                    filesSelectedInModal={this.state.filesSelectedInModal} 
                    handleModalAccept={this.handleModalAccept}
                />
                <ExecutePipelineModal
                    isShowing={this.state.isShowingExecutePipelineModal} 
                    amountFilesSelected={this.state.filesSelectedInModal.length}
                    toggle={this.toggleExecutePipeLineModal}
                    handleExecuteModalBtnNextPressed={this.handleExecuteModalBtnNextPressed}
                />
                <Navbar/>
                <ProjectContainer project={project} activeFeature="data" folders = {['Group Name', project.name, 'Data', 'Pipeline']}/>
                <Instruction 
                    titleText={"How to create a data processing pipeline:"}
                    paragraph={
                        `First, select your data you want to process. Then select one or multiple data operations from the right. 
                            The result of a data pipeline is a data instance, which you can use directly to train a model or merge it into a branch.`
                    }
                 />
                <div className="pipe-line-execution-container flexible-div">
                    <div className="pipe-line-execution">
                        <div className="header flexible-div">
                            <div className="header-left-items flexible-div">
                                <div>
                                    <p>Data Pipeline:</p>
                                </div>
                                <Input name="DataPipelineID" id="renaming-pipeline" placeholder="Rename data pipeline..."/>
                            </div>
                            <div className="header-right-items flexible-div" >
                                <div id="execute-button" className="header-button round-border-button right-item flexible-div" onClick={this.handleExecuteBtn}>
                                    Execute
                                </div>
                                <div className="header-button round-border-button right-item flexible-div">
                                    Save
                                </div>
                                <div className="header-button round-border-button right-item flexible-div">
                                    Load
                                </div>
                            </div>
                        </div>
                        <div id="upload-files-options" className="upload-file">
                            <p className="instruction">
                                Start by selecting your data file(s) you want to include <br/> in your data processing pipeline.
                            </p>
                            <p id="data">
                                Data:
                            </p>
                            
                            <div className="data-button-container flexible-div">
                                <div id="select-data-btn" onClick={this.selectDataClick}>
                                    Select data
                                </div>
                            </div>
                        </div>

                        <div id="text-after-files-selected" className="upload-file" style={{display: 'none'}}>
                            <div style={{width: '50%'}}>
                                <p style={{margin: '6% 0% 6% 2%'}}>
                                    <b>Data:&nbsp;&nbsp;{this.state.filesSelectedInModal.length} file(s) selected</b>
                                </p>
                            </div>
                            <div style={{width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'right', marginRight: '2%'}}>
                                <button style={{backgroundColor: 'white', border: 'none'}} onClick={() => {this.selectDataClick()}}><b> select data </b></button>
                            </div>
                        </div>
                        
                        <SortableDataOperationsList items={items} onSortEnd={this.onSortEnd}/>
                        <div id="drop-zone" onDrop={this.drop} onDragOver={this.allowDrop} >
                            <p style={{marginLeft: '10px', fontWeight: 600}}>{`Op.${operationsSelected}:`}</p>
                            <img src={plus} alt="" style={{height: '80px', marginLeft: '60px'}}/>
                            <p style={{margin: '0', padding: '0', width: '100%', textAlign: 'center'}}> 
                                Drag and drop a data operation from the right into your 
                                <br/>pipeline or <b>create a new one</b>
                            </p>
                        </div>
                        
                    </div>

                    <div className="pipe-line-execution tasks-list">
                        <div className="header">
                            <p>Select a data operations from list:</p>
                        </div>
                        <div className="content">
                            <div className="filter-div flexible-div">
                                <Input name="selectDataOp" id="selectDataOp" placeholder="Search a data operation"/>
                                <div className="search button pipe-line-active flexible-div" onClick={(e) => this.showFilters(e)}>
                                    <img id="show-filters-button" src={plus} alt=""/>
                                </div>
                            </div>

                            <div id="filters" className="invisible">

                                <select className="data-operations-select round-border-button">
                                    <option>All data types</option>
                                    <option>Images data</option>
                                    <option>Text data</option>
                                    <option>Tabular data</option>
                                </select>
                                
                                <div className="checkbox-zone">
                                    <label className="customized-checkbox" >
                                        Only own data operations
                                        <input type="checkbox" value={this.state.checkBoxOwnDataOperations} 
                                            onChange={this.handleCheckMarkClick} id="checkBoxOwnDataOperations"> 
                                        </input>
                                        <span className="checkmark"></span> 
                                    </label>
                                    <label className="customized-checkbox" >
                                        Only starred data operations
                                        <input type="checkbox" value={this.state.checkBoxStarredDataOperations} 
                                            onChange={this.handleCheckMarkClick} id="checkBoxStarredDataOperations">
                                        </input>
                                        <span className="checkmark"></span>
                                    </label>
                                </div>
                                <Input name="minOfStart" id="minOfStart" placeholder="Minimum of stars"/>
                            </div>

                            <DataOperationsList 
                                handleDragStart={this.handleDragStart} 
                                whenDataCardArrowButtonIsPressed={this.whenDataCardArrowButtonIsPressed}
                                dataOperations={dataOperations}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

function mapStateToProps(state){
    return {
        fileData: state.file,
        projects: state.projects
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators(fileActions, dispatch)
    };
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(PipeLineView);