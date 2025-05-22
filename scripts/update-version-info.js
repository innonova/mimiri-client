import { readFile, writeFile } from 'node:fs/promises'

const androidVersionPath = 'android/app/src/main/java/io/mimiri/app/VersionInfo.java';
const iosVersionPath = 'ios/App/App/VersionInfo.swift';

const execute = async () => {
	const baseVersion = JSON.parse((await readFile('./base-version.json')).toString())
	const androidVersionInfo = `package io.mimiri.app;

public class VersionInfo {
	public static final String BaseVersion = "${baseVersion.baseVersion}";
	public static final String HostVersion = "${baseVersion.androidVersion}";
	public static final String ReleaseDate = "${baseVersion.releaseDate}";
}
`
	const iosVersionInfo = `import Foundation
public class VersionInfo {
  public static let BaseVersion: String = "${baseVersion.baseVersion}"
  public static let HostVersion: String = "${baseVersion.iosVersion}"
  public static let ReleaseDate: String = "${baseVersion.releaseDate}"
}

`
	await writeFile(androidVersionPath, androidVersionInfo)
	await writeFile(iosVersionPath, iosVersionInfo)



}

execute();