const Odoo = require('./Odoo');

const model = {
	project: {
		name: 'project.project',
		columns: ['id', 'name', 'task_ids', 'active', 'company_id', 'user_id'],
		strip: ['company_id', 'user_id']
	},
	task: {
		name: 'project.task',
		columns: [
			'id',
			'name',
			'description',
			'date_start',
			'date_end',
			'date_deadline',
			'create_uid',
			'progress',
			'checklist_id',
			'display_name',
			'active',
			'company_id',
			'stage_id',
			'user_id',
			'planned_hours',
			'priority',
			'sequence',
			'project_id'
		],
		strip: ['create_uid', 'company_id', 'stage_id', 'user_id', 'project_id']
	},
	issue: {
		name: 'project.issue',
		columns: [
			'id',
			'name',
			'description',
			'stage_id',
			'create_uid',
			'create_date'
		],
		strip: ['stage_id', 'create_uid']
	}
};

const idStrip = /(.*)_[u]*id/g;

const stripObjectId = (object, column_name) => {
	const column = object[column_name];
	if (!column) {
		return;
	}
	const newName = column_name.replace(idStrip, '$1');
	if (!newName) {
		return;
	}
	if (column.legth < 2) {
		return;
	}
	const newColumn = { id: column[0], name: column[1] };
	delete object[column_name];
	object[newName] = newColumn;
};

const getProjects = (userId, projectId = null, starts = 0, limit = 10) => {
	return new Promise((resolve, reject) => {
		const id = Number(userId);
		const query = [['active', '=', true]];
		if (projectId) {
			query.push(['id', '=', projectId]);
		}
		const getProjectIds = Odoo.searchRecords(
			model.project.name,
			query,
			starts,
			limit
		)
			.then(ids => {
				return ids;
			})
			.catch(error => {
				reject(error);
				return;
			});
		const getProjectColumns = ids => {
			if (!ids) {
				return;
			}
			return getProjectsInfo(ids)
				.then(projects => {
					return projects;
				})
				.catch(error => {
					reject(error);
					return;
				});
		};
		const getTasks = projects => {
			if (!projects) {
				return;
			}
			var all_tasks = [];
			projects.map(project => {
				if (project.task_ids.length > 0) {
					all_tasks = all_tasks.concat(project.task_ids);
				}
			});
			return getTasksInfo(all_tasks)
				.then(tasks => {
					var taskMap = new Map();
					tasks.map(task => {
						taskMap.set(task.id, task);
					});
					projects.map(project => {
						const projectTasks = [];
						const { task_ids } = project;
						task_ids.map(taskId => {
							projectTasks.push(taskMap.get(taskId));
						});
						project.tasks = projectTasks;
					});
					return projects;
				})
				.catch(error => {
					reject(error);
					return;
				});
		};

		getProjectIds
			.then(getProjectColumns)
			.then(getTasks)
			.then(values => {
				var result = { status: 'OK' };
				if (projectId) {
					result.project = values[0];
				} else {
					result.projects = values;
				}
				resolve(result);
			})
			.catch(error => {
				reject(error);
			});
	});
};

const getTaskByProjectId = (userId, projectId, starts = 0, limit = 10) => {
	return new Promise((resolve, reject) => {
		const query = [['active', '=', true]];
		if (projectId) {
			query.push(['id', '=', Number(projectId)]);
		} else {
			reject('ProjectId parameter is required');
			return;
		}
		const getProject = Odoo.searchRecords(model.project.name, query, 0, 1)
			.then(projects => {
				if (!projects || projects.length < 1) {
					reject(
						'No project found with that ID or project is with an inactive state'
					);
					return;
				}
				return projects[0];
			})
			.catch(error => {
				reject(error);
				return;
			});
		const getTaskIds = projectId => {
			const query = [
				['active', '=', true],
				['project_id', '=', projectId]
			];
			return Odoo.searchRecords(model.task.name, query, starts, limit)
				.then(ids => {
					return ids;
				})
				.catch(error => {
					reject(error);
					return null;
				});
		};
		const getTasks = ids => {
			if (!ids) {
				return;
			}
			return getTasksInfo(ids);
		};
		getProject
			.then(getTaskIds)
			.then(getTasks)
			.then(values => {
				resolve({ status: 'OK', tasks: values });
			})
			.catch(error => {
				reject(error);
			});
	});
};

const getTaskById = (userId, taskId, starts = 0, limit = 10) => {
	return new Promise((resolve, reject) => {
		const query = [['active', '=', true]];
		if (taskId) {
			query.push(['id', '=', Number(taskId)]);
		} else {
			reject('TaskId parameter is required');
			return;
		}
		const getTaskId = Odoo.searchRecords(model.task.name, query, 0, 1)
			.then(tasks => {
				if (!tasks || tasks.length < 1) {
					reject(
						'No task found with that ID or task is with an inactive state'
					);
					return;
				}
				return tasks;
			})
			.catch(error => {
				reject(error);
				return;
			});
		const getTaskData = ids => {
			if (!ids) {
				reject('problem reading issues');
				return;
			}
			return getTasksInfo(ids);
		};
		getTaskId
			.then(getTaskData)
			.then(values => {
				resolve({ status: 'OK', task: values.length ? values[0] : {} });
			})
			.catch(error => {
				reject(error);
			});
	});
};

const getIssuesByTaskId = (userId, taskId, starts = 0, limit = 10) => {
	return new Promise((resolve, reject) => {
		const query = [['active', '=', true]];
		if (taskId) {
			query.push(['id', '=', Number(taskId)]);
		} else {
			reject('TaskId parameter is required');
			return;
		}
		const getTaskId = Odoo.searchRecords(model.task.name, query, 0, 1)
			.then(tasks => {
				if (!tasks || tasks.length < 1) {
					reject(
						'No task found with that ID or task is with an inactive state'
					);
					return;
				}
				return tasks[0];
			})
			.catch(error => {
				reject(error);
				return;
			});
		const getIssues = taskId => {
			const query = [
				['active', '=', true],
				['task_id', '=', taskId]
			];
			return Odoo.searchRecords(model.task.name, query, starts, limit)
				.then(ids => {
					return ids;
				})
				.catch(error => {
					reject(error);
					return null;
				});
		};
		const getIssuesData = ids => {
			if (!ids) {
				reject('problem reading issues');
			}
			return getIssuesInfo(ids);
		};
		getTaskId
			.then(getIssues)
			.then(getIssuesData)
			.then(values => {
				resolve({ status: 'OK', issues: values });
			})
			.catch(error => {
				reject(error);
			});
	});
};

const getInfo = (table, ids) => {
	return new Promise((resolve, reject) => {
		const params = [];
		params.push(ids);
		if (table.columns.length > 0) {
			params.push(table.columns);
		}
		return Odoo.readRecords(table.name, params)
			.then(projects => {
				projects.map(project => {
					table.strip.map(column => {
						stripObjectId(project, column);
					});
				});
				resolve(projects);
			})
			.catch(error => {
				reject(error);
			});
	});
};

const getTasksInfo = ids => {
	return getInfo(model.task, ids);
};

const getProjectsInfo = ids => {
	return getInfo(model.project, ids);
};
const getIssuesInfo = ids => {
	return getInfo(model.issue, ids);
};

const getProjectFields = () => {
	return new Promise((resolve, reject) => {
		Odoo.execute_kw('project.task', 'fields_get', [
			[],
			{ attributes: ['string', 'help', 'type'] }
		])
			.then(values => {
				resolve({ message: values });
			})
			.catch(error => {
				reject(error);
			});
	});
};

module.exports = {
	getProjects,
	getProjectFields,
	getTaskByProjectId,
	getTaskById,
	getIssuesByTaskId
};
