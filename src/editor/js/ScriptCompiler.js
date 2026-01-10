class ScriptCompiler {

	static async compileTypeScript( sourceCode ) {

		if ( typeof window === 'undefined' || !window.ts ) {
			console.warn( '[ScriptCompiler] TypeScript compiler not available. Scripts will be used as-is.' );
			return sourceCode;
		}

		try {
			const ts = window.ts;
			
			const compilerOptions = {
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.CommonJS,
				lib: [ 'ES2020', 'DOM' ],
				moduleResolution: ts.ModuleResolutionKind.NodeJs,
				strict: false,
				esModuleInterop: true,
				skipLibCheck: true,
				declaration: false,
				isolatedModules: true
			};

			const result = ts.transpileModule( sourceCode, {
				compilerOptions: compilerOptions,
				reportDiagnostics: true
			} );

			if ( result.diagnostics && result.diagnostics.length > 0 ) {
				const errors = result.diagnostics.filter( d => d.category === ts.DiagnosticCategory.Error );
				if ( errors.length > 0 ) {
					const errorMessages = errors.map( e => {
						let message = '';
						if ( typeof e.messageText === 'string' ) {
							message = e.messageText;
						} else {
							message = ts.flattenDiagnosticMessageText( e.messageText, '\n' );
						}
						const lineInfo = e.file && e.start ? 
							`Line ${e.file.getLineAndCharacterOfPosition( e.start ).line + 1}` : 
							'Unknown line';
						return `${lineInfo}: ${message}`;
					} ).join( '\n' );
					throw new Error( `TypeScript compilation errors:\n${errorMessages}` );
				}
			}

			return result.outputText;

		} catch ( error ) {
			console.error( '[ScriptCompiler] Compilation error:', error );
			throw error;
		}

	}

	static async compileScript( filePath, sourceCode ) {

		if ( !filePath.endsWith( '.ts' ) && !filePath.endsWith( '.tsx' ) ) {
			return null;
		}

		try {
			const compiled = await this.compileTypeScript( sourceCode );
			const jsPath = filePath.replace( /\.tsx?$/, '.js' );
			return {
				path: jsPath,
				content: compiled
			};
		} catch ( error ) {
			console.error( `[ScriptCompiler] Failed to compile ${filePath}:`, error );
			return null;
		}

	}

}

export { ScriptCompiler };
