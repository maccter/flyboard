'use strict';

function wrapFolder (originalFolder) {
    var folder = angular.copy(originalFolder);

    folder.folders = folder.folders || [];
    folder.dataSources = folder.dataSources || [];

    return folder;
}

function unWrapFolder (originalFolder) {
    var folder = angular.copy(originalFolder);

    delete folder.folders;
    delete folder.dataSources;

    return folder;
}

/************************** App modlue *****************************/

var adminApp = angular.module('adminApp', [
    'ngRoute',
    'dataSourceControllers',
    'services',
    'directives',
    'ui.bootstrap',
    'ngDragDrop',
    'translate'
]);

adminApp.config(['$routeProvider',
function($routeProvider){
    $routeProvider.
        //dataSource
        when('/dataSource', {
            templateUrl:'/public/src/dataSource.html',
            controllers: 'dataSourceCtrl'
        }).
        otherwise({
            redirectTo: '/dataSource'
        });
}]);

adminApp.controller('dataSourceCtrl', ['$scope', '$route', '$rootScope', '$routeParams', '$location', '$q', 'DataSource', 'Project', 'SubFolder', 'Folder',
    function($scope, $route, $rootScope, $routeParams, $location, $q, DataSource, Project, SubFolder, Folder){
        if(!$routeParams.projectId) {
            $scope.project = Project.query().$promise.then(function (projects) {
                projects = projects || [];

                if(projects.length){
                    $location.search('projectId', projects[0].id);
                }

                return projects.length > 0 ? projects[0] : {};
            });

            $q.when($scope.project).then(function (project) {
                if(!project){
                    return ;
                }

                $route.reload();
            });
        }

        $scope.projectId = parseInt($routeParams.projectId, 10);

        $scope.tree = {
            id: null
        };

        $scope.selectedDataSourceId = null;

        //projects map
        Project.query().$promise.then(function (projects) {
            $scope.projects = projects.reduce(function (memo, curr) {
                memo[curr.id] = curr;
                return memo;
            }, {});
        });

        function buildFolderTree(folders){
            folders.forEach(function (folder) {
                folder.folders = folder.folders || [];
                if(folder.parent_id){
                    folders.some(function (parentFolder) {
                        if(folder.parent_id === parentFolder.id){
                            parentFolder.folders = parentFolder.folders || [];
                            parentFolder.folders.push(folder);
                            return true;
                        }
                    });
                }
            });

            return folders.map(function (folder) {
                if(folder.parent_id !== null) {
                    return null;
                }
                return folder;
            }).filter(function (folder) {
                return folder !== null;
            });
        }

        Folder.query({
            project_id: $scope.projectId
        }).$promise.then(function (folders){
            $scope.tree.folders =  buildFolderTree(folders) || [];
        });

        DataSource.query({
            project_id: $scope.projectId,
            folder_id: 0
        }).$promise.then(function(dataSources) {
            $scope.tree.dataSources = dataSources || [];
        });

        $scope.selectDataSource = function(dataSource) {
            $scope.selectedDataSourceId = dataSource.id;
            $rootScope.$broadcast('selectedDataSourceChange', $scope.selectedDataSourceId);
        };

        $scope.$on('deleteDataSource', function () {
            $scope.selectedDataSourceId = null;
        });

        $scope.$on('deleteFolder', function () {
            $scope.selectedDataSourceId = null;
        });
    }
]);

adminApp.controller('newDataSourceModalCtrl', ['$scope', '$routeParams', 'DataSource', 'Folder', '$modal',
    function ($scope, $routeParams, DataSource, Folder, $modal) {
        var newDataSourceModalInstanceCtrl = ['$scope', '$rootScope', 'Project', 'Folder', 'DataSource', '$modalInstance',
            function ($scope, $rootScope, Project, Folder, DataSource, $modalInstance) {
                if(!$routeParams.projectId) {
                    return ;
                }

                $scope.projectId = parseInt($routeParams.projectId, 10);

                $scope.newDataSource = {
                    name: null,
                    project_id: $scope.projectId,
                    key: null,
                    config: {
                        dimensions: []
                    },
                    increment: true
                };

                $scope.projects = Project.query();
                $scope.folders = Folder.query({
                    project_id: $scope.projectId
                }).$promise.then(function (folders){
                    var invalidFolder = {
                        id: 0,
                        name: '无'
                    };

                    $scope.folders = [invalidFolder].concat(folders);
                });
                $scope.isEditDimension = false;
                $scope.newDimension = {};

                $scope.addDimension = function () {
                    $scope.isEditDimension = true;
                };

                $scope.delDimension = function (idx) {
                    $scope.newDataSource.config.dimensions.splice(idx, 1);
                };

                $scope.addOk = function () {
                    $scope.newDataSource.config.dimensions.push($scope.newDimension);
                    $scope.newDimension = {};
                    $scope.isEditDimension = false;
                };

                $scope.addCancel = function () {
                    $scope.isEditDimension = false;
                };

                $scope.ok = function () {
                    if(!$scope.newDataSource){
                        return ;
                    }

                    if($scope.newDataSource.folder_id === 0){
                        $scope.newDataSource.folder_id = null;
                    }

                    DataSource.save($scope.newDataSource).$promise.then(function(id){
                        $rootScope.$broadcast('newDatasource', $scope.newDataSource.folder_id, id);
                        $modalInstance.close();
                    });
                };

                $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                };
            }
        ];

        $scope.open = function (dashboard) {
            var newDashboardModalInstance = $modal.open({
                templateUrl: '/public/src/include/dataSource_new_modal.html',
                controller: newDataSourceModalInstanceCtrl,
                resolve: {
                    dashboards: function () {
                        return $scope.dashboards;
                    }
                }
            });
        };
    }
]);

adminApp.controller('newFolderModalCtrl', ['$scope', '$modal',
    function ($scope, $modal) {
        var newFolderModalInstanceCtrl = ['$scope', '$rootScope', '$routeParams', 'Folder', '$modalInstance',
            function ($scope, $rootScope, $routeParams, Folder, $modalInstance) {
                if(!$routeParams.projectId) {
                    return ;
                }

                $scope.projectId = parseInt($routeParams.projectId, 10);

                $scope.newFolder = {
                    project_id: $scope.projectId
                };

                $scope.folders = Folder.query({
                    project_id: $scope.projectId
                }).$promise.then(function (folders){
                    var invalidFolder = {
                        id: 0,
                        name: '无'
                    };

                    $scope.folders = [invalidFolder].concat(folders);
                });

                $scope.ok = function () {
                    if(!$scope.newFolder){
                        return ;
                    }

                    if($scope.newFolder.parent_id === 0){
                        $scope.newFolder.parent_id = null;
                    }

                    Folder.save($scope.newFolder).$promise.then(function (id) {
                        $rootScope.$broadcast('newFolder', $scope.newFolder.parent_id, id);
                        $modalInstance.close();
                    });
                };

                $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                };
            }
        ];

        $scope.open = function (dashboard) {
            var newFolderModalInstance = $modal.open({
                templateUrl: '/public/src/include/folder_new_modal.html',
                controller: newFolderModalInstanceCtrl,
                resolve: {
                    dashboards: function () {
                        return $scope.dashboards;
                    }
                }
            });
        };
    }
]);

adminApp.controller('treeNodeCtrl', ['$scope', '$timeout', '$rootScope', 'DataSource', 'Folder',
    function($scope, $timeout, $rootScope, DataSource, Folder) {

        $scope.onDrop = function (evt, ui) {
            if ($rootScope.dropTimer) {
                $timeout.cancel($rootScope.dropTimer);
            }

            $rootScope.dropTimer = $timeout(function () {
                var dragObj = $rootScope.dragObj;
                var type = dragObj.type;
                var obj = dragObj.obj || {};
                var idx = null;
                var oldTreeWrapper = null;

                if (type === 'data_source') {     //dragObj is dataSource
                    oldTreeWrapper = dragObj.treeWrapper;

                    if (obj.folder_id === $scope.treeWrapper.id) {
                        angular.element(ui.draggable[0]).removeAttr('style');
                        return;
                    }

                    //update database
                    obj.folder_id = $scope.treeWrapper.id === 0 ? null : $scope.treeWrapper.id;

                    DataSource.update({
                        id: obj.id
                    }, obj);

                    //update angular data
                    idx = oldTreeWrapper.dataSources.indexOf(obj);

                    if (idx === -1) {
                        return;
                    }

                    oldTreeWrapper.dataSources.splice(idx, 1);
                    $scope.treeWrapper.dataSources.splice(0, 0, obj);
                }
                else if (type === 'folder') {          //dragObj is folder
                    oldTreeWrapper = dragObj.outerTreeWrapper;

                    if (obj.parent_id === $scope.treeWrapper.id) {
                        angular.element(ui.draggable[0]).removeAttr('style');
                        return;
                    }

                    //update database
                    obj.parent_id = $scope.treeWrapper.id;

                    var copyObj = unWrapFolder(obj);

                    Folder.update({
                        id: obj.id
                    }, copyObj);

                    //update angular data
                    idx = oldTreeWrapper.folders.indexOf(obj);

                    if (idx === -1) {
                        return;
                    }

                    oldTreeWrapper.folders.splice(idx, 1);
                    $scope.treeWrapper.folders.splice(0, 0, obj);
                }
            }, 25);

        };

        $scope.$on('newDatasource', function (event, folderId, dataSourceId) {
            if (!folderId && $scope.treeWrapper.id) {
                return;
            }

            if (folderId && folderId !== $scope.treeWrapper.id) {
                return;
            }

            DataSource.get(dataSourceId).$promise.then(function (dataSource) {
                $scope.treeWrapper.dataSources.push(dataSource);
            });
        });

        $scope.$on('newFolder', function (event, parentFolderId, folderId) {
            if (!parentFolderId && $scope.treeWrapper.id) {
                return;
            }

            if (parentFolderId && parentFolderId !== $scope.treeWrapper.id) {
                return;
            }

            Folder.get(folderId).$promise.then(function (folder) {
                var wrappedFolder = wrapFolder(folder);
                $scope.treeWrapper.folders.push(wrappedFolder);
            });
        });

        $scope.$on('deleteFolder', function (event, parentFolderId, folderId, isRecursive, deletedFolderTreeWrapper) {
            if (!parentFolderId && $scope.treeWrapper.id) {
                return;
            }

            if (parentFolderId && parentFolderId !== $scope.treeWrapper.id) {
                return;
            }
            $scope.treeWrapper.folders.some(function (folder, idx) {
                if (folder.id === folderId) {
                    if (!isRecursive) {
                        $scope.treeWrapper.folders = $scope.treeWrapper.folders.concat(deletedFolderTreeWrapper.folders || []);
                        $scope.treeWrapper.dataSources = $scope.treeWrapper.dataSources.concat(deletedFolderTreeWrapper.dataSources || []);
                    }

                    $scope.treeWrapper.folders.splice(idx, 1);
                    return true;
                }
            });
        });

        $scope.$on('updateDataSource', function (event, folderId, dataSourceId) {
            if (!folderId && $scope.treeWrapper.id) {
                return;
            }

            if (folderId && folderId !== $scope.treeWrapper.id) {
                return;
            }

            DataSource.get({
                id: dataSourceId
            }).$promise.then(function (dataSource) {
                $scope.treeWrapper.dataSources.some(function (ds) {
                    if (ds.id === dataSource.id) {
                        ds.name = dataSource.name;
                        return true;
                    }
                });
            });
        });

        $scope.$on('deleteDataSource', function (event, folderId, dataSourceId) {
            if (!folderId && $scope.treeWrapper.id) {
                return;
            }

            if (folderId && folderId !== $scope.treeWrapper.id) {
                return;
            }

            $scope.treeWrapper.dataSources.some(function(ds, idx) {
                if(ds.id === dataSourceId){
                    $scope.treeWrapper.dataSources.splice(idx, 1);
                    return true;
                }
            });
        });
    }
]);

adminApp.controller('folderItemCtrl', ['$scope', '$timeout', '$rootScope', 'Folder', 'DataSource',
    function ($scope, $timeout, $rootScope, Folder, DataSource) {
        $scope.isCollapsed = true;
        $scope.isMouseOver = false;
        $scope.isEdit = false;

        function queryTree(folder) {
            var ret = {
                id: folder.id,
                folders: folder.folders,
                dataSources: DataSource.query({
                    folder_id: folder.id,
                    project_id: $scope.projectId
                })
            };

            return ret;
        }

        $scope.treeWrapper = queryTree($scope.folder);

        $scope.toggleCollapse = function () {
            $scope.isCollapsed = !$scope.isCollapsed;
        };

        $scope.editFolder = function () {
           $scope.isEdit = true;
        };

        $scope.saveFolder = function () {

            var folder = unWrapFolder($scope.folder);

            Folder.update({
                id: folder.id
            }, folder).$promise.then(function () {
                $scope.isEdit = false;
            });
        };

        $scope.onDrag = function ($outerTreeWrapper) {
            $rootScope.dragObj = {
                type: 'folder',
                obj: $scope.folder,
                outerTreeWrapper: $scope.outerTreeWrapper,
                treeWrapper: $scope.treeWrapper
            };
        };

        $scope.onDrop = function(evt, ui) {
            if ($rootScope.dropTimer) {
                $timeout.cancel($rootScope.dropTimer);
            }

            $rootScope.dropTimer = $timeout(function () {
                var dragObj = $rootScope.dragObj;
                var type = dragObj.type;
                var obj = dragObj.obj || {};
                var oldTreeWrapper = null;
                var idx = null;

                if(type === 'data_source'){     //dragObj is dataSource
                    oldTreeWrapper = dragObj.treeWrapper;

                    if(obj.folder_id === $scope.folder.id){
                        angular.element(ui.draggable[0]).removeAttr('style');
                        return;
                    }

                    //update database
                    obj.folder_id = $scope.folder.id === 0 ? null: $scope.folder.id;

                    DataSource.update({
                        id: obj.id
                    },obj);
                    //update angular data
                    idx = oldTreeWrapper.dataSources.indexOf(obj);

                    if(idx === -1){
                        return ;
                    }

                    oldTreeWrapper.dataSources.splice(idx, 1);
                    $scope.treeWrapper.dataSources.splice(0, 0, obj);
                }
                else if(type === 'folder'){          //dragObj is folder
                    oldTreeWrapper = dragObj.outerTreeWrapper;

                    if(obj.parent_id === $scope.folder.id) {
                        angular.element(ui.draggable[0]).removeAttr('style');
                        return ;
                    }

                    //update database
                    obj.parent_id = $scope.folder.id;

                    var copyObj = unWrapFolder(obj);

                    Folder.update({
                        id: obj.id
                    }, copyObj);

                    //update angular data
                    idx = oldTreeWrapper.folders.indexOf(obj);

                    if(idx === -1){
                        return ;
                    }

                    oldTreeWrapper.folders.splice(idx, 1);
                    $scope.treeWrapper.folders.splice(0, 0, obj);
                }
            }, 25);
        };
    }
]);

adminApp.controller('dataSourceItemCtrl', ['$scope', '$rootScope',
    function ($scope, $rootScope) {
        $scope.onDrag = function () {
            $rootScope.dragObj = {
                type: 'data_source',
                obj: $scope.dataSource,
                treeWrapper: $scope.treeWrapper
            };
        };
    }
]);

/************************** dataSource Controllers *****************************/

var dataSourceControllers = angular.module('dataSourceControllers', [
    'services'
]);

dataSourceControllers.controller('dataSourceInfoCtrl', ['$scope', '$rootScope', 'DataSource', 'Project',
    function($scope, $rootScope, DataSource, Project) {
        $scope.dataSource = null;

        $scope.projects = Project.query();

        $scope.$on('selectedDataSourceChange', function(event, dataSourceId) {
            $scope.dataSource = DataSource.get({
                id: dataSourceId
            });
        });

        $scope.invalid = {};
        $scope.submit = function () {
           DataSource.update({
               id: $scope.dataSource.id
           }, $scope.dataSource).$promise.then(function(dataSource){
                $rootScope.$broadcast('updateDataSource', dataSource.folder_id, dataSource.id);
            });
        };
    }
]);

dataSourceControllers.controller('dataSourceMethodCtrl', ['$scope', '$rootScope', 'RecordSave', 'Project', 'DataSource', 'CurrentUser', 'UserToken',
    function ($scope, $rootScope, RecordSave, Project, DataSource, CurrentUser, UserToken) {
        $scope.dataSource = null;
        $scope.project = null;
        $scope.user = CurrentUser.get().$promise;

        $scope.token = $scope.user.then(function (user){
            $scope.user = user;

            return UserToken.get({
                id: user.id
            }).$promise;
        }).then(function (ret){
            $scope.token = ret.token;
        });

        var now = new Date();
        $scope.showJsonExample = JSON.stringify({
            value: 100,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hour: now.getHours(),
            minute: now.getMinutes(),
            second: now.getSeconds()
        }, null, 4);

        $scope.data = angular.copy($scope.showJsonExample);

        $scope.$on('selectedDataSourceChange', function(event, dataSourceId) {
            DataSource.get({
                id: dataSourceId
            }).$promise.then(function (dataSource) {
                $scope.dataSource = dataSource;
                $scope.project = Project.get({
                    id: dataSource.project_id
                });
            });
        });

        $scope.submit = function(){
            var data = JSON.parse($scope.data);

            RecordSave.save({
                uuid: $scope.project.uuid,
                key: $scope.dataSource.key
            }, data).$promise.then(function (record) {
                $rootScope.$broadcast('newRecord', record);
            });
        };
    }
]);

dataSourceControllers.controller('dataSourceRecordListCtrl', ['$rootScope', '$scope', 'Record', 'DataSource', 'RecordDeleteOne',
    function($rootScope, $scope, Record, DataSource, RecordDeleteOne){
        $scope.offset = 0;
        $scope.isLast = false;
        var INTERVAL = 100;

        $scope.$on('selectedDataSourceChange', function(event, dataSourceId) {
            $scope.dataSourceId = dataSourceId;
            $scope.offset = 0;
            $scope.isLast = false;

            Record.query({
                id: dataSourceId,
                count: INTERVAL,
                offset: $scope.offset
            }).$promise.then(function (records){
                $scope.records = records;

                $scope.isLast = records.length < INTERVAL;
            });

            $scope.dataSource = DataSource.get({
                id: dataSourceId
            });

            $scope.formatTime = function(record){
                var date = new Date(record.year || 0,
                                    record.month - 1 || 0,
                                    record.day || 0,
                                    record.hour || 0,
                                    record.minute || 0,
                                    record.second || 0
                                    );

                return formatTime(date);
            };
        });

        $scope.delete = function (record) {
            //删除Record后刷新Record List
            RecordDeleteOne.delete({
                id: record.id
            }).$promise.then(function () {
                var idx = $scope.records.indexOf(record);
                if (idx === -1) {
                    return;
                }
                $scope.records.splice(idx, 1);
            });
        };

        $scope.nextPage = function () {
            if($scope.isLast){
                return ;
            }

            $scope.offset += INTERVAL;

            return Record.query({
                id: $scope.dataSourceId,
                count: INTERVAL,
                offset: $scope.offset
            }).$promise.then(function (records){
                $scope.records = records;

                if(records.length < INTERVAL){
                    $scope.isLast = true;
                }
            });
        };

        $scope.prevPage = function () {
            if($scope.offset === 0){
                return ;
            }

            $scope.offset = $scope.offset >= INTERVAL ? $scope.offset - INTERVAL : 0;

            return Record.query({
                id: $scope.dataSourceId,
                count: INTERVAL,
                offset: $scope.offset
            }).$promise.then(function (records){
                $scope.records = records;
                $scope.isLast = false;
            });
        };

        $rootScope.$on('newRecord', function (event, record) {
//            console.log('scorp records', $scope.records);
            $scope.records = $scope.records || [];

            //if the record exists, update
            var flag = $scope.records.some(function (rec){
                if(rec.id === record.id){
                    rec.value = record.value;
                    return true;
                }

                return false;
            });

            if(flag){
                return ;
            }

            //add new record to list
            $scope.records.unshift(record);
        });
    }
]);

adminApp.controller('confirmDeleteDataSourceCtrl', ['$scope', '$modal',
    function ($scope, $modal) {
        var deleteConfirmModalInstanceCtrl = ['$rootScope', '$scope', '$q', 'DataSource', '$modalInstance', 'dataSourceId',
            function ($rootScope, $scope, $q, DataSource, $modalInstance, dataSourceId) {
                $scope.ok = function(){
                    DataSource.get({
                        id: dataSourceId
                    }).$promise.then(function (ds) {
                        $rootScope.$broadcast('deleteDataSource', ds.folder_id, ds.id);
                        DataSource.delete({
                            id: ds.id
                        }).$promise.then(function () {
                            $modalInstance.close();
                        });
                    });
                };

                $scope.cancel = function(){
                    $modalInstance.dismiss('cancel');
                };
            }
        ];

        $scope.open = function (dataSourceId) {
            var deleteConfirmModalInstance = $modal.open({
                templateUrl: '/public/src/include/confirm_delete_modal.html',
                controller: deleteConfirmModalInstanceCtrl,
                resolve: {
                    dataSourceId: function () {
                        return dataSourceId;
                    }
                }
            });
        };
    }
]);

adminApp.controller('confirmClearRecordCtrl', ['$scope', '$modal',
    function ($scope, $modal) {
        var deleteConfirmModalInstanceCtrl = ['$rootScope', '$scope', '$q', 'Project', 'DataSource', 'RecordDeleteAll', '$modalInstance', 'dataSourceId', 'records',
            function ($rootScope, $scope, $q, Project, DataSource, RecordDeleteAll, $modalInstance, dataSourceId, records) {
                $scope.ok = function(){
                    var uuid = null;
                    var key = null;

                    DataSource.get({
                        id:dataSourceId
                    }).$promise.then(function (dataSource){
                        key = dataSource.key;

                        return Project.get({
                            id: dataSource.project_id
                        }).$promise;
                    }).then(function (project) {
                        uuid = project.uuid;

                        return RecordDeleteAll.delete({
                            key: key,
                            uuid: uuid
                        }).$promise;
                    }).then(function () {
                        records.splice(0);
                        $modalInstance.close();
                    });
                };

                $scope.cancel = function(){
                    $modalInstance.dismiss('cancel');
                };
            }
        ];

        $scope.open = function (dataSourceId, records) {
            var deleteConfirmModalInstance = $modal.open({
                templateUrl: '/public/src/include/confirm_delete_modal.html',
                controller: deleteConfirmModalInstanceCtrl,
                resolve: {
                    dataSourceId: function () {
                        return dataSourceId;
                    },
                    records: function () {
                        return records;
                    }
                }
            });
        };
    }
]);

adminApp.controller('confirmDeleteFolderCtrl', ['$scope', '$modal',
    function ($scope, $modal) {
        var deleteConfirmModalInstanceCtrl = ['$rootScope', '$scope', '$q', 'Folder', '$modalInstance', 'folder', 'deletedFolderTreeWrapper',
            function ($rootScope, $scope, $q, Folder, $modalInstance, folder, deletedFolderTreeWrapper) {
                $scope.ok = function(isRecursive){
                    Folder.delete({
                        id: folder.id,
                        recursive: isRecursive || false
                    }).$promise.then(function () {
                        $rootScope.$broadcast('deleteFolder', folder.parent_id, folder.id, isRecursive, deletedFolderTreeWrapper);
                        $modalInstance.close();
                    });
                };

                $scope.cancel = function(){
                    $modalInstance.dismiss('cancel');
                };
            }
        ];

        $scope.open = function (folder, treeWrapper) {
            var deleteConfirmModalInstance = $modal.open({
                templateUrl: '/public/src/include/folder_confirm_delete_modal.html',
                controller: deleteConfirmModalInstanceCtrl,
                resolve: {
                    folder: function () {
                        return folder;
                    },
                    deletedFolderTreeWrapper : function(){
                        return treeWrapper;
                    }
                }
            });
        };
    }
]);
