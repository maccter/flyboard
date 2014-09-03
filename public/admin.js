'use strict';/************************** services modlue *****************************/var services = angular.module('services', [    'ngResource']);services.service('DataSource', function($resource){    return $resource('/api/data_sources/:id', null, {            'update': {method: 'PUT'}        });});services.service('DataSourceBelongToFolder', function($resource){    return $resource('/api/folders/:id/data_sources');});services.service('Project', function($resource){    return $resource('/api/projects/:id');});services.service('Widget', function($resource){    return $resource('/api/dashboards/:dashboardid/widgets/:id', null, {        'update': {method: 'PUT'}    });});services.service('Dashboard', function($resource){    return $resource('/api/dashboards/:id', null, {        'update': {method: 'PUT'}    });});services.service('RecordSave', function($resource){    return $resource('/api/projects/:uuid/data_sources/:key');});services.service('Record', function($resource){    return $resource('/api/data_sources/:id/records');});services.service('RecordDelete', function($resource){    return $resource('/api/records/:id');});services.service('Folder', function($resource) {    return $resource('/api/folders/:id', null, {        'update': {method: 'PUT'}    });});services.service('SubFolder', function($resource) {    return $resource('/api/folders/:parent_id/folders');});/************************** App modlue *****************************/var adminApp = angular.module('adminApp', [    'ngRoute',    'dataSourceControllers',    'services',    'ui.bootstrap',    'ngDragDrop']);adminApp.config(['$routeProvider',function($routeProvider){    $routeProvider.        //dataSource        when('/dataSource', {            templateUrl:'/public/src/dataSource.html',            controllers: 'dataSourceCtrl'        }).        when('/dataSource/edit/:dataSourceId', {            templateUrl: '/public/src/dataSource_edit.html'        }).        when('/dataSource/new', {            templateUrl: '/public/src/dataSource_new.html',            controllers:'dataSourceNewCtrl'        }).        when('/dataSource/delete/:dataSourceId', {            controllers: 'dataSourceDeleteCtrl'        }).        otherwise({        });}]);adminApp.controller('dataSourceCtrl', ['$scope', '$rootScope', '$q', 'DataSource', 'Project', 'Folder',    function($scope, $rootScope, $q, DataSource, Project, Folder){        $scope.tree = {            id: null        };        $scope.selectedDataSourceId = null;        //projects map        Project.query().$promise.then(function (projects) {            $scope.projects = projects.reduce(function (memo, curr) {                memo[curr.id] = curr;                return memo;            }, {});        });        function buildFolderTree(folders){            folders.forEach(function (folder) {                folder.children = folder.children || [];                if(folder.parent_id){                    folders.some(function (parentFolder) {                        if(folder.parent_id === parentFolder.id){                            parentFolder.children = parentFolder.children || [];                            parentFolder.children.push(folder);                            return true;                        }                    });                }            });            return folders.map(function (folder) {                if(folder.parent_id !== null) {                    return null;                }                return folder;            }).filter(function (folder) {                return folder !== null;            });        }        Folder.query({            parent_id: null        }).$promise.then(function (folders){            $scope.tree.folders =  buildFolderTree(folders);        });        DataSource.query({            folder_id: 0        }).$promise.then(function(dataSources) {            $scope.tree.dataSources = dataSources;        });        $scope.selectDataSource = function(dataSource) {            $scope.selectedDataSourceId = dataSource.id;        };    }]);adminApp.controller('treeNodeCtrl', ['$scope', '$timeout', '$rootScope', 'DataSource', 'Folder',    function($scope, $timeout, $rootScope, DataSource, Folder){        $scope.onDrop = function (evt, ui) {            if ($rootScope.dropTimer) {                $timeout.cancel($rootScope.dropTimer);            }            $rootScope.dropTimer = $timeout(function () {                var dragObj = $rootScope.dragObj;                var type = dragObj.type;                var obj = dragObj.obj || {};                if(type === 'data_source'){     //dragObj is dataSource                    var oldTreeWrapper = dragObj.treeWrapper;                    if(obj.folder_id === $scope.treeWrapper.id){                        angular.element(ui.draggable[0]).removeAttr('style');                        return;                    }                    //update database                    obj.folder_id = $scope.treeWrapper.id === 0 ? null : $scope.treeWrapper.id;                    DataSource.update({                        id: obj.id                    },obj);                    //update angular data                    var idx = oldTreeWrapper.dataSources.indexOf(obj);                    if(idx === -1){                        return ;                    }                    oldTreeWrapper.dataSources.splice(idx, 1);                    $scope.treeWrapper.dataSources.splice(0, 0, obj);                }                else if(type === 'folder'){          //dragObj is folder                    var oldTreeWrapper = dragObj.outerTreeWrapper;                    if(obj.parent_id === $scope.treeWrapper.id) {                        angular.element(ui.draggable[0]).removeAttr('style');                        return ;                    }                    //update database                    obj.parent_id = $scope.treeWrapper.id;                    var copyObj = angular.copy(obj);                    delete copyObj.children;                    Folder.update({                        id: obj.id                    }, copyObj);                    //update angular data                    var idx = oldTreeWrapper.folders.indexOf(obj);                    if(idx === -1){                        return ;                    }                    oldTreeWrapper.folders.splice(idx, 1);                    $scope.treeWrapper.folders.splice(0, 0, obj);                }            }, 25);        };    }]);adminApp.controller('folderItemCtrl', ['$scope', '$timeout', '$rootScope', 'Folder', 'DataSource',    function ($scope, $timeout, $rootScope, Folder, DataSource) {        $scope.isCollapsed = true;        function queryTree(folder) {            var ret = {                id: folder.id,                folders: folder.children,                dataSources: DataSource.query({                    folder_id: folder.id                })            };            return ret;        }        $scope.treeWrapper = queryTree($scope.folder);        $scope.onDrag = function ($outerTreeWrapper) {            $rootScope.dragObj = {                type: 'folder',                obj: $scope.folder,                outerTreeWrapper: $scope.outerTreeWrapper,                treeWrapper: $scope.treeWrapper            };        };        $scope.onDrop = function(evt, ui) {            if ($rootScope.dropTimer) {                $timeout.cancel($rootScope.dropTimer);            }            $rootScope.dropTimer = $timeout(function () {                var dragObj = $rootScope.dragObj;                var type = dragObj.type;                var obj = dragObj.obj || {};                if(type === 'data_source'){     //dragObj is dataSource                    var oldTreeWrapper = dragObj.treeWrapper;                    if(obj.folder_id === $scope.folder.id){                        angular.element(ui.draggable[0]).removeAttr('style');                        return;                    }                    //update database                    obj.folder_id = $scope.folder.id === 0 ? null: $scope.folder.id;                    DataSource.update({                        id: obj.id                    },obj);                    //update angular data                    var idx = oldTreeWrapper.dataSources.indexOf(obj);                    if(idx === -1){                        return ;                    }                    oldTreeWrapper.dataSources.splice(idx, 1);                    $scope.treeWrapper.dataSources.splice(0, 0, obj);                }                else if(type === 'folder'){          //dragObj is folder                    var oldTreeWrapper = dragObj.outerTreeWrapper;                    if(obj.parent_id === $scope.folder.id) {                        angular.element(ui.draggable[0]).removeAttr('style');                        return ;                    }                    //update database                    obj.parent_id = $scope.folder.id;                    var copyObj = angular.copy(obj);                    delete copyObj.children;                    Folder.update({                        id: obj.id                    }, copyObj);                    //update angular data                    var idx = oldTreeWrapper.folders.indexOf(obj);                    if(idx === -1){                        return ;                    }                    oldTreeWrapper.folders.splice(idx, 1);                    $scope.treeWrapper.folders.splice(0, 0, obj);                }            }, 25);        };    }]);adminApp.controller('dataSourceItemCtrl', ['$scope', '$rootScope',    function ($scope, $rootScope) {        $scope.onDrag = function () {            $rootScope.dragObj = {                type: 'data_source',                obj: $scope.dataSource,                treeWrapper: $scope.treeWrapper            };        };    }]);adminApp.controller('NavCtrl', function ($scope, $rootScope) {    $scope.active = 'dashboard';    $rootScope.$on('$routeChangeSuccess', function(current, routes){        if(routes.loadedTemplateUrl === '/public/src/dataSource.html' || routes.loadedTemplateUrl === '/public/src/dataSource_edit.html'){            $scope.active = 'dataSource';        }        else if(routes.loadedTemplateUrl === '/public/src/dashboard.html'){            $scope.active = 'dashboard';        }    });});/************************** dataSource Controllers *****************************/var dataSourceControllers = angular.module('dataSourceControllers', [    'services']);dataSourceControllers.controller('dataSourceInfoCtrl', ['$scope', '$routeParams', 'DataSource', 'Project',    function($scope, $routeParams, DataSource, Project) {        DataSource.get({id: $routeParams.dataSourceId}).$promise.then(function(dataSource){            $scope.dataSource = dataSource;        });        Project.query().$promise.then(function(projects){            $scope.projects = projects;        });        $scope.invalid = {};        $scope.submit = function () {            //验证表单数据是否合法            var valid = true;            if (!$scope.dataSource.name) {                $scope.invalid.name = 'ng-invalid ng-dirty';                valid = false;            }            if (!$scope.dataSource.project_id) {                $scope.invalid.project_id = 'ng-invalid ng-dirty';                valid = false;            }            if (!$scope.dataSource.key) {                $scope.invalid.key = 'ng-invalid ng-dirty';                valid = false;            }            if (!valid) {                return;            }            //提交后给出成功操作的提示            DataSource.update({id: $scope.dataSource.id}, $scope.dataSource);        };    }]);dataSourceControllers.controller('dataSourceMethodCtrl', ['$scope', '$routeParams', 'Project', 'DataSource',    function ($scope, $routeParams, Project, DataSource) {        DataSource.get({id: $routeParams.dataSourceId}).$promise.then(function (ds) {            $scope.project = Project.get({                id: ds.project_id            });        });        $scope.showJsonExample = JSON.stringify({            value: 100,            year: 2014,            month: 7,            day: 3,            hour: 16,            minute: 0,            second: 0        }, null, 4);        $scope.dataSource = DataSource.get({id: $routeParams.dataSourceId});    }]);dataSourceControllers.controller('dataSourceTestCtrl', ['$rootScope', '$scope', '$routeParams', 'RecordSave', 'Project', 'DataSource',    function($rootScope, $scope, $routeParams, RecordSave, Project, DataSource){        $scope.data = JSON.stringify({            value: 100,            year: 2014,            month: 7,            day: 3,            hour: 16,            minute: 0,            second: 0        }, null, 4);        DataSource.get({id: $routeParams.dataSourceId}).$promise.then(function (ds) {            $scope.dataSource = ds;            $scope.project = Project.get({                id: ds.project_id            });        });        $scope.submit = function(){            var data = JSON.parse($scope.data);            RecordSave.save({                uuid: $scope.project.uuid,                key: $scope.dataSource.key            }, data).$promise.then(function (record) {                $rootScope.$broadcast('newRecord', record);            });        };    }]);dataSourceControllers.controller('dataSourceRecordListCtrl', ['$rootScope', '$scope', '$routeParams', 'Record', 'DataSource', 'RecordDelete',    function($rootScope, $scope, $routeParams, Record, DataSource, RecordDelete){        $scope.records = Record.query({            id: $routeParams.dataSourceId,            limit: 10        });        $scope.getDataSource = function(id){            return DataSource.get({                id: id            });        };        $scope.delete = function (record) {            //删除Record后刷新Record List            RecordDelete.delete({                id: record.id            }).$promise.then(function () {                var idx = $scope.records.indexOf(record);                if (idx === -1) {                    return;                }                $scope.records.splice(idx, 1);            });        };        $rootScope.$on('newRecord', function (event, record) {            $scope.records.unshift(record);        });    }]);dataSourceControllers.controller('dataSourceNewCtrl', ['$scope', '$location', 'DataSource', 'Project',    function($scope, $location, DataSource, Project) {            $scope.projects = Project.query();            $scope.dataSource = {};            $scope.submit = function () {                //提交后给出成功操作的提示                DataSource.save($scope.dataSource).$promise.then(function(dataSource){                    $location.url('/dataSource/edit/' + dataSource.id);                });            };        }]);dataSourceControllers.controller('confirmDeleteDataSourceCtrl', ['$scope', '$modal',    function($scope, $modal){        var deleteConfirmModalInstanceCtrl = ['$scope', 'DataSource', '$modalInstance', 'dataSource', 'dataSources',            function ($scope, DataSource, $modalInstance, dataSource, dataSources) {                $scope.ok = function(){                    var idx = dataSources.indexOf(dataSource);                    if(idx === -1){                        $modalInstance.close();                    }                    dataSources.splice(idx, 1);                    DataSource.delete({                        id: dataSource.id                    }).$promise.then(function () {                        $modalInstance.close();                    });                };                $scope.cancel = function(){                    $modalInstance.dismiss('cancel');                };            }        ];        $scope.open = function (dataSource) {            var deleteConfirmModalInstance = $modal.open({                templateUrl: '/public/src/include/confirm_delete_modal.html',                controller: deleteConfirmModalInstanceCtrl,                resolve: {                    dataSource: function () {                        return dataSource;                    },                    dataSources: function () {                        return $scope.treeWrapper.dataSources;                    }                }            });        };    }]);